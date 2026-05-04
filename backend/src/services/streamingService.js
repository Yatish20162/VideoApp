const fs = require("fs");

const CHUNK_SIZE = 1 * 1024 * 1024; // 1 MB per chunk

/**
 * streamVideo — serves video file with HTTP 206 Partial Content
 *
 * The browser <video> element automatically sends Range headers.
 * We respond with just the requested byte range so the browser
 * can seek, buffer ahead, and handle playback without downloading
 * the entire file.
 *
 * @param {Request}  req       - Express request (must have Range header)
 * @param {Response} res       - Express response
 * @param {string}   filepath  - Absolute path to video on disk
 * @param {string}   mimetype  - e.g. "video/mp4"
 */
const streamVideo = (req, res, filepath, mimetype = "video/mp4") => {
  // Verify file exists before attempting to stream
  if (!fs.existsSync(filepath)) {
    return res.status(404).json({ success: false, message: "Video file not found on server." });
  }

  const stat = fs.statSync(filepath);
  const fileSize = stat.size;
  const rangeHeader = req.headers.range;

  if (!rangeHeader) {
    // No Range header — send entire file (useful for download)
    res.writeHead(200, {
      "Content-Length": fileSize,
      "Content-Type": mimetype,
      "Accept-Ranges": "bytes",
    });
    fs.createReadStream(filepath).pipe(res);
    return;
  }

  // Parse the Range header: "bytes=start-end"
  const parts = rangeHeader.replace(/bytes=/, "").split("-");
  const start = parseInt(parts[0], 10);
  const end = parts[1] ? parseInt(parts[1], 10) : Math.min(start + CHUNK_SIZE - 1, fileSize - 1);

  // Validate range
  if (start >= fileSize || end >= fileSize || start > end) {
    res.writeHead(416, {
      "Content-Range": `bytes */${fileSize}`,
      "Content-Type": "text/plain",
    });
    return res.end("Range Not Satisfiable");
  }

  const chunkLength = end - start + 1;

  res.writeHead(206, {
    "Content-Range": `bytes ${start}-${end}/${fileSize}`,
    "Accept-Ranges": "bytes",
    "Content-Length": chunkLength,
    "Content-Type": mimetype,
    // Allow cross-origin video embed
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Expose-Headers": "Content-Range, Accept-Ranges, Content-Length",
  });

  const stream = fs.createReadStream(filepath, { start, end });

  stream.on("error", (err) => {
    console.error("Stream error:", err.message);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: "Stream error" });
    } else {
      res.end();
    }
  });

  stream.pipe(res);
};

module.exports = { streamVideo };