const mongoose = require("mongoose");

const videoSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    originalName: {
      type: String, // original filename from user's machine
    },
    filename: {
      type: String, // UUID-based filename on disk
      required: true,
    },
    filepath: {
      type: String, // absolute path on disk
      required: true,
    },
    mimetype: {
      type: String,
    },
    size: {
      type: Number, // bytes
      default: 0,
    },
    duration: {
      type: Number, // seconds (filled after FFmpeg probe)
      default: 0,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
    },
    status: {
      type: String,
      enum: ["processing", "safe", "flagged", "error"],
      default: "processing",
    },
    sensitivity: {
      score: { type: Number, default: 0 },   // 0.0 – 1.0
      reason: { type: String, default: "" }, // human-readable
    },
    assignedTo: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    processingProgress: {
      type: Number, // 0–100
      default: 0,
    },
  },
  { timestamps: true }
);

// Index for fast user-scoped queries
videoSchema.index({ owner: 1, status: 1 });
videoSchema.index({ orgId: 1, status: 1 });

module.exports = mongoose.model("Video", videoSchema);