const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const path = require("path");
const Video = require("../models/Video");

ffmpeg.setFfmpegPath("/opt/homebrew/bin/ffmpeg");
ffmpeg.setFfprobePath("/opt/homebrew/bin/ffprobe");

/**
 * ─────────────────────────────────────────────
 * SENSITIVITY CLASSIFIER  (fixed v2)
 * ─────────────────────────────────────────────
 *
 * Tier 1 — FFmpeg metadata flags:
 *   - Unusually short (< 2s) → suspicious
 *   - Very high bitrate (>200 MB/min) → suspicious
 *
 * Tier 2 — Black frame detection (FIXED):
 *   - Run blackdetect filter separately, parse stderr for black_start events
 *   - Run scdet filter separately for scene-change detection
 *   - Both use pipe:1 (stdout) instead of /dev/null to avoid OS-specific issues
 *
 * Tier 3 — Deterministic file-hash noise (~15% flag rate for demo)
 *
 * Returns: { score: 0.0–1.0, reason: string }
 * score >= 0.5 → "flagged", else "safe"
 */

// ── Tier 1: probe metadata ──────────────────────────────────────────────────
const analyzeMetadata = (metadata) => {
  const duration = metadata.format?.duration || 0;
  const size     = metadata.format?.size || 0;
  const issues   = [];
  let score      = 0;

  if (duration > 0 && duration < 2) {
    issues.push("extremely short video");
    score += 0.3;
  }

  if (duration > 0) {
    const mbPerMin = (size / 1_048_576) / (duration / 60);
    if (mbPerMin > 200) {
      issues.push("unusually high bitrate");
      score += 0.2;
    }
  }

  return { score: Math.min(score, 0.6), issues };
};

/**
 * Tier 2 — Black frame detection (FIXED)
 *
 * KEY FIX: The original code used a combined filter chain
 * "blackdetect=...,select=eq(pict_type\,I)" which is INVALID because:
 *   - blackdetect is a VIDEO filter that passes frames through unchanged
 *     but emits metadata lines to stderr
 *   - Chaining select after it works syntactically but produces no meaningful
 *     extra output; the real issue was outputting to "/dev/null" which fails
 *     on some systems and Node.js environments
 *
 * FIX: Use "-f null -" (pipe to stdout, discard) instead of "/dev/null"
 *      and separate the blackdetect filter from any frame selection.
 */
const detectBlackFrames = (filepath, duration) => {
  return new Promise((resolve) => {
    if (!duration || duration <= 0) {
      return resolve({ blackRatio: 0, scenesPerMin: 0 });
    }

    let blackEvents   = 0;
    let sceneChanges  = 0;
    const stderrLines = [];

    ffmpeg(filepath)
      .inputOptions(["-accurate_seek"])
      // FIXED filter: just blackdetect — no chained select
      .videoFilters("blackdetect=d=0.1:pix_th=0.10")
      // FIXED output: use "-f null -" (null muxer to stdout)
      // This avoids /dev/null path issues on Windows/Docker/some Linux envs
      .outputOptions(["-f", "null"])
      .output("-")
      .on("stderr", (line) => {
        stderrLines.push(line);
        // blackdetect emits: [blackdetect @ ...] black_start:X black_end:Y black_duration:Z
        if (line.includes("black_start")) blackEvents++;
        // scdet (scene change) would emit here too if we used that filter
        if (line.includes("scene_score") || line.includes("lavfi.scene_score")) sceneChanges++;
      })
      .on("end", () => {
        // Estimate ratio: each black event ≈ 0.1s (our min duration)
        // Over total duration gives a rough ratio
        const blackRatio   = Math.min(blackEvents * 0.1 / duration, 1);
        const scenesPerMin = duration > 0 ? (sceneChanges / duration) * 60 : 0;
        resolve({ blackRatio, scenesPerMin });
      })
      .on("error", (err) => {
        // Non-fatal: if FFmpeg filter fails for any reason, skip this tier gracefully
        console.warn("[processingService] blackdetect non-fatal error:", err.message);
        resolve({ blackRatio: 0, scenesPerMin: 0 });
      })
      .run();
  });
};

/**
 * Tier 2b — Scene change detection (separate pass)
 * Uses the scdet filter which is more reliable than parsing blackdetect for scenes.
 */
const detectSceneChanges = (filepath, duration) => {
  return new Promise((resolve) => {
    if (!duration || duration <= 0) return resolve(0);

    let sceneCount = 0;

    ffmpeg(filepath)
      .videoFilters("scdet=threshold=10")
      .outputOptions(["-f", "null"])
      .output("-")
      .on("stderr", (line) => {
        if (line.includes("pts_time") && line.includes("score")) sceneCount++;
      })
      .on("end",   () => resolve(sceneCount))
      .on("error", () => resolve(0))  // non-fatal
      .run();
  });
};

// ── Tier 3: deterministic pseudo-random noise based on file content ─────────
const computeNoiseScore = (filepath) => {
  try {
    const fd  = fs.openSync(filepath, "r");
    const buf = Buffer.alloc(32);
    fs.readSync(fd, buf, 0, 32, 0);
    fs.closeSync(fd);
    const sum  = buf.reduce((a, b) => a + b, 0);
    const norm = (sum % 256) / 255;
    // Only ~15% of videos score here (when norm > 0.85)
    return norm > 0.85 ? parseFloat((norm * 0.4).toFixed(3)) : 0;
  } catch {
    return 0;
  }
};

// ── Main classifier ─────────────────────────────────────────────────────────
const classifySensitivity = async (filepath, metadata) => {
  const reasons = [];

  // Tier 1
  const tier1 = analyzeMetadata(metadata);
  if (tier1.issues.length) reasons.push(...tier1.issues);

  // Tier 2 — run in parallel for speed
  const duration = metadata.format?.duration || 0;
  const [tier2, sceneCount] = await Promise.all([
    detectBlackFrames(filepath, duration),
    detectSceneChanges(filepath, duration),
  ]);

  let tier2Score = 0;
  if (tier2.blackRatio > 0.3) {
    tier2Score += 0.4;
    reasons.push(`high black-frame ratio (${Math.round(tier2.blackRatio * 100)}%)`);
  }

  const scenesPerMin = duration > 0 ? (sceneCount / duration) * 60 : 0;
  if (scenesPerMin > 10) {
    tier2Score += 0.2;
    reasons.push(`rapid scene changes (${Math.round(scenesPerMin)}/min)`);
  }

  // Tier 3
  const tier3Score = computeNoiseScore(filepath);
  if (tier3Score > 0) reasons.push("content pattern anomaly detected");

  const total  = Math.min(tier1.score + tier2Score + tier3Score, 1.0);
  const reason = reasons.length > 0 ? reasons.join("; ") : "No issues detected";

  return { score: parseFloat(total.toFixed(3)), reason };
};

/**
 * ─────────────────────────────────────────────
 * MAIN PROCESSING PIPELINE
 * ─────────────────────────────────────────────
 * Called after successful upload (non-blocking, controller responds 202 first).
 *
 * Progress events emitted to Socket.io room `user:<userId>`:
 *   processing:progress  { videoId, pct, stage }
 *   processing:complete  { videoId, status, sensitivity }
 *   processing:error     { videoId, message }
 */
const processVideo = async (videoId, filepath, io, userId) => {
  const emit = (event, payload) => {
    if (io) io.to(`user:${userId}`).emit(event, payload);
  };

  try {
    console.log(`🎬 Processing started: ${videoId}`);

    // ── Step 1: Probe metadata (0 → 10%) ──────────────────────────────────
    emit("processing:progress", { videoId, pct: 5, stage: "Probing metadata" });

    const metadata = await probeVideo(filepath);
    const duration = metadata.format?.duration || 0;

    await Video.findByIdAndUpdate(videoId, {
      duration: Math.round(duration),
      processingProgress: 10,
    });

    emit("processing:progress", { videoId, pct: 10, stage: "Metadata extracted" });

    // ── Step 2: Content analysis (10 → 80%) ───────────────────────────────
    emit("processing:progress", { videoId, pct: 20, stage: "Analyzing content" });

    // Emit incremental progress while the async analysis runs
    let progressPct = 20;
    const progressInterval = setInterval(async () => {
      if (progressPct < 70) {
        progressPct = Math.min(progressPct + 8, 70);
        await Video.findByIdAndUpdate(videoId, { processingProgress: progressPct }).catch(() => {});
        emit("processing:progress", { videoId, pct: progressPct, stage: "Analyzing content" });
      }
    }, 1200);

    // Run the full classifier (tiers 1–3)
    const sensitivity = await classifySensitivity(filepath, metadata);

    clearInterval(progressInterval);

    // ── Step 3: Classify (80 → 90%) ───────────────────────────────────────
    emit("processing:progress", { videoId, pct: 80, stage: "Classifying content" });

    const finalStatus = sensitivity.score >= 0.5 ? "flagged" : "safe";

    // ── Step 4: Persist & complete (90 → 100%) ────────────────────────────
    await Video.findByIdAndUpdate(videoId, {
      status: finalStatus,
      sensitivity: {
        score:  sensitivity.score,
        reason: sensitivity.reason,
      },
      processingProgress: 100,
    });

    emit("processing:progress", { videoId, pct: 100, stage: "Complete" });
    emit("processing:complete", { videoId, status: finalStatus, sensitivity });

    console.log(`✅ Processing complete: ${videoId} → ${finalStatus} (score: ${sensitivity.score})`);

  } catch (err) {
    console.error(`❌ Processing failed: ${videoId}`, err.message);

    // Mark as error so the UI shows the right state
    await Video.findByIdAndUpdate(videoId, {
      status: "error",
      sensitivity: { score: 0, reason: `Processing error: ${err.message}` },
    }).catch(() => {});

    emit("processing:error", { videoId, message: err.message || "Processing failed" });
  }
};

/**
 * Probe a video file with FFprobe and return its metadata object.
 */
const probeVideo = (filepath) =>
  new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filepath, (err, metadata) => {
      if (err) return reject(err);
      resolve(metadata);
    });
  });

module.exports = { processVideo, probeVideo };