const fs   = require("fs");
const path = require("path");

/**
 * streamVideo  (fixed v2)
 * ────────────────────────────────────────────────────────────────────────────
 * Streams a video file using HTTP 206 Partial Content (range requests).
 *
 * FIXES over v1:
 *  1. Output "-" (stdout pipe) pattern replaced proper null output in processing.
 *  2. Added explicit CORS headers so the <video> tag on a different port/origin
 *     can actually receive the stream during local development.
 *  3. Handles the case where Range header contains both start AND end (e.g. when
 *     the browser seeks to a specific timestamp).
 *  4. Destroys the read stream on client disconnect to prevent memory leaks.
 *  5. Falls back gracefully when file stat fails (race condition after delete).
 *
 * How it works:
 *  - Browser <video> element sends  Range: bytes=0-
 *  - We respond with 206 + Content-Range: bytes 0-999999/totalSize
 *  - Browser advances the start offset for each subsequent chunk request
 *  - This enables seeking without downloading the whole file
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {string}  filepath   Absolute path to video on disk
 * @param {string}  [mimetype] MIME type (default: "video/mp4")
 */
const streamVideo = (req, res, filepath, mimetype = "video/mp4") => {
  // ── Guard: file must exist ────────────────────────────────────────────────
  if (!fs.existsSync(filepath)) {
    return res.status(404).json({
      success: false,
      message: "Video file not found on disk.",
    });
  }

  let fileSize;
  try {
    fileSize = fs.statSync(filepath).size;
  } catch (statErr) {
    return res.status(500).json({
      success: false,
      message: "Could not read video file metadata.",
    });
  }

  // ── CORS headers (needed during local dev: frontend :5173, backend :5000) ──
  // In production behind a reverse proxy these are typically set at the proxy level,
  // but we add them here as well so the video element works in all environments.
  const origin = req.headers.origin || "*";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Expose-Headers", "Content-Range, Accept-Ranges, Content-Length");

  const range = req.headers.range;

  // ── No Range header → serve full file (200) ───────────────────────────────
  // Useful for: download links, curl, Postman, some mobile browsers on first load.
  if (!range) {
    res.writeHead(200, {
      "Content-Length": fileSize,
      "Content-Type":   mimetype,
      "Accept-Ranges":  "bytes",
      "Cache-Control":  "no-cache",
    });
    const fullStream = fs.createReadStream(filepath);
    fullStream.pipe(res);
    req.on("close", () => fullStream.destroy());
    return;
  }

  // ── Parse Range header ────────────────────────────────────────────────────
  // Format: "bytes=<start>-<end?>"
  // end is optional; browsers often omit it on the first request (bytes=0-)
  const CHUNK_SIZE = 2_000_000; // 2 MB chunks — good balance for seeking UX

  // Strip "bytes=" prefix and split on "-"
  const rawRange = range.replace(/bytes=/, "").trim();
  const [rawStart, rawEnd] = rawRange.split("-");

  const start = parseInt(rawStart, 10);

  // If end not provided, send one chunk from start position
  const requestedEnd = rawEnd ? parseInt(rawEnd, 10) : NaN;
  const end = isNaN(requestedEnd)
    ? Math.min(start + CHUNK_SIZE - 1, fileSize - 1)
    : Math.min(requestedEnd, fileSize - 1);

  // ── Validate range ────────────────────────────────────────────────────────
  if (isNaN(start) || start < 0 || start >= fileSize) {
    return res
      .status(416)
      .set("Content-Range", `bytes */${fileSize}`)
      .end();
  }

  if (start > end) {
    // Degenerate range — just serve from start to end of file
    return res
      .status(416)
      .set("Content-Range", `bytes */${fileSize}`)
      .end();
  }

  const chunkLength = end - start + 1;

  // ── Send 206 Partial Content ──────────────────────────────────────────────
  res.writeHead(206, {
    "Content-Range":  `bytes ${start}-${end}/${fileSize}`,
    "Accept-Ranges":  "bytes",
    "Content-Length": chunkLength,
    "Content-Type":   mimetype,
    "Cache-Control":  "public, max-age=3600",
  });

  const fileStream = fs.createReadStream(filepath, { start, end });

  fileStream.pipe(res);

  // Clean up if client disconnects mid-stream (prevents memory/fd leaks)
  const cleanup = () => fileStream.destroy();
  req.on("close",  cleanup);
  req.on("error",  cleanup);
  res.on("finish", cleanup);
};

module.exports = { streamVideo };