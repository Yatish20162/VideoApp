const User = require("../models/User");
const Video = require("../models/Video");

// GET all users (same org)
exports.getUsers = async (req, res) => {
  const users = await User.find({ orgId: req.user.orgId }).select("-password");
  res.json(users);
};

// GET all videos
exports.getVideos = async (req, res) => {
  const videos = await Video.find({ orgId: req.user.orgId });
  res.json(videos);
};

// Assign video
exports.assignVideo = async (req, res) => {
  const { videoId, userIds } = req.body;

  const video = await Video.findOne({
    _id: videoId,
    orgId: req.user.orgId,
  });

  if (!video) {
    return res.status(404).json({ message: "Video not found" });
  }

  video.assignedTo = userIds;
  await video.save();

  res.json({ message: "Assigned successfully", video });
};