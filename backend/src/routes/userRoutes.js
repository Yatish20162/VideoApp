const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const { authorize } = require("../middleware/rbac");
const {
  getUsers,
  getUserById,
  updateUserRole,
  deleteUser,
} = require("../controllers/userController");

// All user management routes: must be authenticated AND admin
router.use(protect, authorize("admin"));

// GET  /api/users
router.get("/", getUsers);

// GET  /api/users/:id
router.get("/:id", getUserById);

// PATCH /api/users/:id/role
router.patch("/:id/role", updateUserRole);

// DELETE /api/users/:id
router.delete("/:id", deleteUser);

module.exports = router;