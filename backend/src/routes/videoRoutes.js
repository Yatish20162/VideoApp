const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const { authorize } = require("../middleware/rbac");
const { upload } = require("../utils/upload");
const {
  uploadVideo,
  getVideos,
  getVideoById,
  deleteVideo,
  streamVideoHandler,
  getVideoStatus,
} = require("../controllers/videoController");

// All video routes require authentication
router.use(protect);

// ── Upload ──────────────────────────────────────────────────────────────────
// POST /api/videos/upload
// Multer runs AFTER protect so req.user._id is available for folder naming
router.post(
  "/upload",
  authorize("editor", "admin"),
  upload.single("video"),
  uploadVideo
);

// ── List ────────────────────────────────────────────────────────────────────
// GET /api/videos?status=safe&page=1&limit=20&sort=newest
router.get("/", getVideos);

// ── Single video ─────────────────────────────────────────────────────────────
// GET /api/videos/:id
router.get("/:id", getVideoById);

// ── Status poll (fallback for no socket) ─────────────────────────────────────
// GET /api/videos/:id/status
router.get("/:id/status", getVideoStatus);

// ── Stream ───────────────────────────────────────────────────────────────────
// GET /api/videos/:id/stream
router.get("/:id/stream", streamVideoHandler);

// ── Delete ────────────────────────────────────────────────────────────────────
// DELETE /api/videos/:id
router.delete("/:id", authorize("editor", "admin"), deleteVideo);

module.exports = router;