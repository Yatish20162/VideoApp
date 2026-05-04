const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * protect – verifies JWT and attaches req.user
 * Usage: router.get("/route", protect, handler)
 */
const protect = async (req, res, next) => {
  try {
    let token;

    // Support both Authorization: Bearer <token> and cookie
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer ")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated. Please log in.",
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user (without password) to request
    const user = await User.findById(decoded.id).populate("orgId", "name plan");
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User belonging to this token no longer exists.",
      });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === "JsonWebTokenError") {
      return res.status(401).json({ success: false, message: "Invalid token." });
    }
    if (err.name === "TokenExpiredError") {
      return res
        .status(401)
        .json({ success: false, message: "Token expired. Please log in again." });
    }
    next(err);
  }
};

module.exports = { protect };