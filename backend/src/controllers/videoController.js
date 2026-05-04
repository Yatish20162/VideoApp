const fs = require("fs");
const path = require("path");
const Video = require("../models/Video");
const { processVideo } = require("../services/processingService");
const { streamVideo } = require("../services/streamingService");

// io (Socket.io) is injected at app startup via setIO()
let io;
const setIO = (socketIO) => { io = socketIO; };

/**
 * POST /api/videos/upload
 * Auth: editor | admin
 * Multipart: field name "video"
 *
 * Responds 202 immediately, kicks off background processing.
 */
const uploadVideo = async (req, res, next) => {
  try {
    console.log("📥 Upload route hit");

    if (!req.file) {
      console.log("❌ No file received");
      return res.status(400).json({ success: false, message: "No video file uploaded." });
    }

    console.log("✅ File received:", req.file);

    const { title } = req.body;

    if (!title || !title.trim()) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, message: "Video title is required." });
    }

    const video = await Video.create({
      title: title.trim(),
      originalName: req.file.originalname,
      filename: req.file.filename,
      filepath: req.file.path,
      mimetype: req.file.mimetype,
      size: req.file.size,
      owner: req.user._id,
      orgId: req.user.orgId,
      status: "processing",
      processingProgress: 0,
    });

    console.log("📦 Saved to DB:", video._id);

    res.status(202).json({
      success: true,
      message: "Video uploaded. Processing started.",
      videoId: video._id,
    });

    processVideo(
      video._id.toString(),
      req.file.path,
      io,
      req.user._id.toString()
    ).catch((err) =>
      console.error("❌ Background processing error:", err.message)
    );

  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/videos
 * Auth: any role
 * Query params:
 *   ?status=processing|safe|flagged|error   (filter)
 *   ?page=1&limit=20                        (pagination)
 *   ?sort=newest|oldest|title               (sorting)
 *
 * Viewers/Editors: see only own videos
 * Admins: see all videos in their org
 */
const getVideos = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20, sort = "newest" } = req.query;

    // Build query filter
    const filter = {};

    if (req.user.role === "admin") {
      // Admin sees entire org
      filter.orgId = req.user.orgId;
    } else {
      // Everyone else sees only their own
      filter.owner = req.user._id;
    }

    // Optional status filter
    if (status && ["processing", "safe", "flagged", "error"].includes(status)) {
      filter.status = status;
    }

    // Sorting
    const sortMap = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      title:  { title: 1 },
    };
    const sortOrder = sortMap[sort] || sortMap.newest;

    // Pagination
    const pageNum = Math.max(parseInt(page, 10), 1);
    const limitNum = Math.min(parseInt(limit, 10), 100);
    const skip = (pageNum - 1) * limitNum;

    const [videos, total] = await Promise.all([
      Video.find(filter)
        .populate("owner", "name email")
        .sort(sortOrder)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Video.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      videos,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/videos/:id
 * Auth: any role
 * Returns single video metadata
 */
const getVideoById = async (req, res, next) => {
  try {
    const video = await Video.findById(req.params.id)
      .populate("owner", "name email")
      .lean();

    if (!video) {
      return res.status(404).json({ success: false, message: "Video not found." });
    }

    // Ownership check
    const isOwner    = video.owner._id.toString() === req.user._id.toString();
    const isAdmin    = req.user.role === "admin";
    const isSameOrg  = video.orgId?.toString() === req.user.orgId?.toString();

    if (!isOwner && !(isAdmin && isSameOrg)) {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    res.status(200).json({ success: true, video });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/videos/:id
 * Auth: editor (own) | admin (any in org)
 * Deletes DB record AND file from disk
 */
const deleteVideo = async (req, res, next) => {
  try {
    const video = await Video.findById(req.params.id);

    if (!video) {
      return res.status(404).json({ success: false, message: "Video not found." });
    }

    const isOwner    = video.owner.toString() === req.user._id.toString();
    const isAdmin    = req.user.role === "admin";
    const isSameOrg  = video.orgId?.toString() === req.user.orgId?.toString();

    if (!isOwner && !(isAdmin && isSameOrg)) {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    // Delete file from disk
    if (fs.existsSync(video.filepath)) {
      fs.unlinkSync(video.filepath);
    }

    await video.deleteOne();

    res.status(200).json({ success: true, message: "Video deleted successfully." });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/videos/:id/stream
 * Auth: any role
 * Streams video with HTTP range request support
 */
const streamVideoHandler = async (req, res, next) => {
  try {
    const video = await Video.findById(req.params.id);

    if (!video) {
      return res.status(404).json({ success: false, message: "Video not found." });
    }

    // Access check
    const isOwner   = video.owner.toString() === req.user._id.toString();
    const isAdmin   = req.user.role === "admin";
    const isSameOrg = video.orgId?.toString() === req.user.orgId?.toString();

    if (!isOwner && !(isAdmin && isSameOrg)) {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    // Only allow streaming of processed videos
    if (video.status === "processing") {
      return res.status(409).json({
        success: false,
        message: "Video is still being processed. Please wait.",
      });
    }

    streamVideo(req, res, video.filepath, video.mimetype || "video/mp4");
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/videos/:id/status
 * Auth: any role
 * Lightweight poll endpoint (fallback if Socket.io not available)
 */
const getVideoStatus = async (req, res, next) => {
  try {
    const video = await Video.findById(req.params.id, "status processingProgress sensitivity");

    if (!video) {
      return res.status(404).json({ success: false, message: "Video not found." });
    }

    res.status(200).json({
      success: true,
      videoId: video._id,
      status: video.status,
      progress: video.processingProgress,
      sensitivity: video.sensitivity,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  uploadVideo,
  getVideos,
  getVideoById,
  deleteVideo,
  streamVideoHandler,
  getVideoStatus,
  setIO,
};