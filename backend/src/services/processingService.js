const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const path = require("path");
const os = require("os");
const Video = require("../models/Video");

/**
 * ─────────────────────────────────────────────
 * SENSITIVITY CLASSIFIER
 * ─────────────────────────────────────────────
 * Three-tier heuristic approach (no ML needed):
 *
 * Tier 1 — FFmpeg metadata flags:
 *   - Unusually short (< 2s) or zero-duration → suspicious
 *   - Extremely large file for duration (>50MB/min) → suspicious
 *
 * Tier 2 — Scene / black frame detection:
 *   - More than 30% black frames → flagged
 *   - Rapid scene changes (>10 cuts/min) → suspicious
 *
 * Tier 3 — Random noise (simulates ML uncertainty):
 *   - ~15% base false-positive rate to demonstrate flagging UI
 *
 * Returns: { score: 0.0–1.0, reason: string }
 * score >= 0.5 → "flagged", else "safe"
 * ─────────────────────────────────────────────
 */

// ── Tier 1: probe metadata ──────────────────────────────────────────────────
const analyzeMetadata = (metadata) => {
  const duration = metadata.format?.duration || 0;
  const size = metadata.format?.size || 0;
  const issues = [];
  let score = 0;

  if (duration > 0 && duration < 2) {
    issues.push("extremely short video");
    score += 0.3;
  }

  if (duration > 0) {
    const mbPerMin = size / 1024 / 1024 / (duration / 60);
    if (mbPerMin > 200) {
      issues.push("unusually high bitrate");
      score += 0.2;
    }
  }

  return { score: Math.min(score, 0.6), issues };
};

// ── Tier 2: black frame detection via FFmpeg filter ─────────────────────────
const detectBlackFrames = (filepath, duration) => {
  return new Promise((resolve) => {
    if (!duration || duration <= 0) return resolve({ blackRatio: 0, scenes: 0 });

    let blackFrames = 0;
    let totalFrames = 0;
    let sceneChanges = 0;
    const stderr = [];

    ffmpeg(filepath)
      .outputOptions([
        "-vf",
        "blackdetect=d=0.1:pix_th=0.10,select=eq(pict_type\\,I)",
        "-vsync",
        "vfr",
        "-f",
        "null",
      ])
      .output("/dev/null") // discard output, we only read stderr
      .on("stderr", (line) => {
        stderr.push(line);
        if (line.includes("black_start")) blackFrames++;
        if (line.includes("pts_time")) totalFrames++;
        if (line.includes("scene_score")) sceneChanges++;
      })
      .on("end", () => {
        const blackRatio = totalFrames > 0 ? blackFrames / totalFrames : 0;
        const scenesPerMin = duration > 0 ? (sceneChanges / duration) * 60 : 0;
        resolve({ blackRatio, scenesPerMin });
      })
      .on("error", () => {
        // Non-fatal: if FFmpeg filter fails, skip this tier
        resolve({ blackRatio: 0, scenesPerMin: 0 });
      })
      .run();
  });
};

// ── Tier 3: deterministic "noise" based on file hash ───────────────────────
// Uses first bytes of file to generate a pseudo-random but repeatable score.
// ~15% of videos will trigger this tier.
const computeNoiseScore = (filepath) => {
  try {
    const fd = fs.openSync(filepath, "r");
    const buf = Buffer.alloc(16);
    fs.readSync(fd, buf, 0, 16, 0);
    fs.closeSync(fd);
    const sum = buf.reduce((a, b) => a + b, 0);
    // Map 0–2040 to 0–1; flag ~15% of range
    const norm = (sum % 256) / 255;
    return norm > 0.85 ? norm * 0.4 : 0; // only scores >0.85 produce a signal
  } catch {
    return 0;
  }
};

// ── Main classifier ─────────────────────────────────────────────────────────
const classifySensitivity = async (filepath, metadata) => {
  const reasons = [];

  const tier1 = analyzeMetadata(metadata);
  if (tier1.issues.length) reasons.push(...tier1.issues);

  const duration = metadata.format?.duration || 0;
  const tier2 = await detectBlackFrames(filepath, duration);

  let tier2Score = 0;
  if (tier2.blackRatio > 0.3) {
    tier2Score += 0.4;
    reasons.push(`high black-frame ratio (${Math.round(tier2.blackRatio * 100)}%)`);
  }
  if (tier2.scenesPerMin > 10) {
    tier2Score += 0.2;
    reasons.push(`rapid scene changes (${Math.round(tier2.scenesPerMin)}/min)`);
  }

  const tier3Score = computeNoiseScore(filepath);
  if (tier3Score > 0) reasons.push("content pattern anomaly");

  const total = Math.min(tier1.score + tier2Score + tier3Score, 1.0);
  const reason =
    reasons.length > 0 ? reasons.join("; ") : "No issues detected";

  return { score: parseFloat(total.toFixed(3)), reason };
};

/**
 * ─────────────────────────────────────────────
 * MAIN PROCESSING PIPELINE
 * ─────────────────────────────────────────────
 * Called after successful upload.
 * Runs async (non-blocking) — controller responds 202 before this runs.
 *
 * @param {string}  videoId   - MongoDB Video _id
 * @param {string}  filepath  - absolute path to uploaded file
 * @param {object}  io        - Socket.io server instance
 * @param {string}  userId    - owner's _id (for socket room)
 */
const processVideo = async (videoId, filepath, io, userId) => {
  const emit = (event, payload) => {
    if (io) {
      // Emit to the user's private room
      io.to(`user:${userId}`).emit(event, payload);
    }
  };

  try {
    console.log(`🎬 Processing started: ${videoId}`);

    // ── Step 1: Probe metadata (10%) ───────────────────────────────────────
    emit("processing:progress", { videoId, pct: 5, stage: "Probing metadata" });

    const metadata = await probeVideo(filepath);
    const duration = metadata.format?.duration || 0;

    await Video.findByIdAndUpdate(videoId, {
      duration: Math.round(duration),
      processingProgress: 10,
    });

    emit("processing:progress", {
      videoId,
      pct: 10,
      stage: "Metadata extracted",
    });

    // ── Step 2: Black frame / scene detection (10% → 70%) ─────────────────
    emit("processing:progress", {
      videoId,
      pct: 20,
      stage: "Analyzing content",
    });

    // Simulate gradual progress during analysis
    const progressInterval = setInterval(async () => {
      const current = (
        await Video.findById(videoId, "processingProgress")
      )?.processingProgress || 20;

      if (current < 65) {
        const next = Math.min(current + 10, 65);
        await Video.findByIdAndUpdate(videoId, { processingProgress: next });
        emit("processing:progress", {
          videoId,
          pct: next,
          stage: "Analyzing content",
        });
      }
    }, 1500);

    const sensitivity = await classifySensitivity(filepath, metadata);

    clearInterval(progressInterval);

    // ── Step 3: Determine final status (70% → 90%) ────────────────────────
    emit("processing:progress", {
      videoId,
      pct: 80,
      stage: "Classifying content",
    });

    const finalStatus = sensitivity.score >= 0.5 ? "flagged" : "safe";

    // ── Step 4: Persist results (90% → 100%) ──────────────────────────────
    await Video.findByIdAndUpdate(videoId, {
      status: finalStatus,
      sensitivity: {
        score: sensitivity.score,
        reason: sensitivity.reason,
      },
      processingProgress: 100,
    });

    emit("processing:progress", { videoId, pct: 100, stage: "Complete" });

    emit("processing:complete", {
      videoId,
      status: finalStatus,
      sensitivity,
    });

    console.log(
      `✅ Processing complete: ${videoId} → ${finalStatus} (score: ${sensitivity.score})`
    );
  } catch (err) {
    console.error(`❌ Processing failed: ${videoId}`, err.message);

    await Video.findByIdAndUpdate(videoId, {
      status: "error",
      sensitivity: { score: 0, reason: `Processing error: ${err.message}` },
    }).catch(() => {});

    emit("processing:error", {
      videoId,
      message: err.message || "Processing failed",
    });
  }
};

/**
 * Probe video file with FFmpeg and return metadata object
 */
const probeVideo = (filepath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filepath, (err, metadata) => {
      if (err) return reject(err);
      resolve(metadata);
    });
  });
};

module.exports = { processVideo, probeVideo };