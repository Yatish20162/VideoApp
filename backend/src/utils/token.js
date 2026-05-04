const jwt = require("jsonwebtoken");

/**
 * Generate a signed JWT for a user
 * @param {string} id  - MongoDB user _id
 * @returns {string}   - signed JWT string
 */
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

/**
 * Build safe user object to send in responses (no password)
 */
const sanitizeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  orgId: user.orgId,
  createdAt: user.createdAt,
});

module.exports = { generateToken, sanitizeUser };