const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/auth");
const { authorize } = require("../middleware/rbac");

const {
  getUsers,
  getVideos,
  assignVideo,
} = require("../controllers/adminController");

router.get("/users", protect, authorize("admin"), getUsers);
router.get("/videos", protect, authorize("admin"), getVideos);
router.post("/assign", protect, authorize("admin"), assignVideo);

module.exports = router;