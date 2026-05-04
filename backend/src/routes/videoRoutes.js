const express = require("express");
const router  = express.Router();
const { protect }  = require("../middleware/auth");
const { authorize } = require("../middleware/rbac");
const { upload }   = require("../utils/upload");
const {
  uploadVideo,
  getVideos,
  getVideoById,
  deleteVideo,
  streamVideoHandler,
  getVideoStatus,
} = require("../controllers/videoController");

// All video routes require authentication
// NOTE: protect middleware reads the token from:
//   - Authorization: Bearer <token>  (all regular API calls via Axios)
//   - ?token=<token> query param     (video <src> streaming URLs — browsers
//                                     cannot set headers on <video src="...">)
router.use(protect);

// ── Upload ──────────────────────────────────────────────────────────────────
// POST /api/videos/upload
router.post(
  "/upload",
  authorize("editor", "admin"),
  upload.single("video"),
  uploadVideo
);

// ── List ─────────────────────────────────────────────────────────────────────
// GET /api/videos?status=safe&page=1&limit=20&sort=newest
router.get("/", getVideos);

// ── IMPORTANT: specific sub-routes MUST be defined BEFORE "/:id" ─────────────
// Otherwise Express matches "/:id/stream" as id="<videoId>" and route="/stream"

// GET /api/videos/:id/stream  — HTTP 206 range-request streaming
router.get("/:id/stream", streamVideoHandler);

// GET /api/videos/:id/status  — lightweight poll fallback
router.get("/:id/status", getVideoStatus);

// ── Single video metadata ─────────────────────────────────────────────────────
// GET /api/videos/:id
router.get("/:id", getVideoById);

// ── Delete ─────────────────────────────────────────────────────────────────────
// DELETE /api/videos/:id
router.delete("/:id", authorize("editor", "admin"), deleteVideo);

module.exports = router;