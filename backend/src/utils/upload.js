const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");

// Allowed video MIME types
const ALLOWED_MIME_TYPES = [
  "video/mp4",
  "video/mpeg",
  "video/quicktime",
  "video/x-msvideo",  // .avi
  "video/x-matroska", // .mkv
  "video/webm",
];

const ALLOWED_EXTENSIONS = [".mp4", ".mpeg", ".mov", ".avi", ".mkv", ".webm"];

/**
 * Disk storage — saves to uploads/{userId}/{uuid}{ext}
 * userId is injected via req.user (protect middleware must run first)
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!req.user || !req.user._id) {
      return cb(new Error("Unauthorized: user not found"), null);
    }
    
    // Per-user folder for isolation
    const userDir = path.join(
      process.cwd(),
      process.env.UPLOAD_DIR || "./uploads",
      req.user._id.toString()
    );

    fs.mkdirSync(userDir, { recursive: true });
    cb(null, userDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${uuidv4()}${ext}`;
    cb(null, uniqueName);
  },
});

/**
 * File filter — reject non-video files early
 */
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  if (
    file.mimetype.startsWith("video/") &&
    ALLOWED_EXTENSIONS.includes(ext)
  ) {
    cb(null, true);
  } else {
    cb(
      new multer.MulterError(
        "LIMIT_UNEXPECTED_FILE",
        `Only video files are allowed. Got: ${file.mimetype}`
      ),
      false
    );
  }
};

const MAX_SIZE_MB = parseInt(process.env.MAX_FILE_SIZE_MB || "500", 10);

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_SIZE_MB * 1024 * 1024, // convert MB → bytes
    files: 1,
  },
});

module.exports = { upload };