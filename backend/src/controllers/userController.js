const User = require("../models/User");
const { sanitizeUser } = require("../utils/token");

/**
 * GET /api/users
 * Admin only — lists all users in the same org
 */
const getUsers = async (req, res, next) => {
  try {
    const users = await User.find({ orgId: req.user.orgId })
      .select("-password")
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({ success: true, total: users.length, users });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/users/:id
 * Admin only — get single user in org
 */
const getUserById = async (req, res, next) => {
  try {
    const user = await User.findOne({
      _id: req.params.id,
      orgId: req.user.orgId,
    }).select("-password");

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    res.status(200).json({ success: true, user });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/users/:id/role
 * Admin only — update a user's role
 * Body: { role: "viewer" | "editor" | "admin" }
 */
const updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    const validRoles = ["viewer", "editor", "admin"];

    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Role must be one of: ${validRoles.join(", ")}.`,
      });
    }

    // Prevent admin from demoting themselves
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot change your own role.",
      });
    }

    const user = await User.findOneAndUpdate(
      { _id: req.params.id, orgId: req.user.orgId },
      { role },
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    res.status(200).json({
      success: true,
      message: `Role updated to '${role}'.`,
      user,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/users/:id
 * Admin only — remove user from org (does NOT delete their videos)
 */
const deleteUser = async (req, res, next) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot delete your own account.",
      });
    }

    const user = await User.findOneAndDelete({
      _id: req.params.id,
      orgId: req.user.orgId,
    });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    res.status(200).json({ success: true, message: "User removed." });
  } catch (err) {
    next(err);
  }
};

module.exports = { getUsers, getUserById, updateUserRole, deleteUser };