const User = require("../models/User");
const Organization = require("../models/Organization");
const { generateToken, sanitizeUser } = require("../utils/token");

/**
 * POST /api/auth/register
 * Body: { name, email, password, role?, orgName? }
 *
 * - If orgName is provided → creates a new org and makes user its first admin
 * - If orgId is provided  → joins an existing org (role stays as given)
 * - Otherwise             → creates a personal default org
 */
const register = async (req, res) => {
  try {
    const { name, email, password, role, orgName } = req.body;

    if (!name || !email || !password || !orgName) {
      return res.status(400).json({
        success: false,
        message: "All fields including orgName are required.",
      });
    }

    // Check user exists
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Email already registered",
      });
    }

    // 🔥 FIND OR CREATE ORG
    let organization = await Organization.findOne({ name: orgName });

    if (!organization) {
      organization = await Organization.create({
        name: orgName,
        members: [],
      });
    }

    // Role logic
    const assignedRole =
      role && ["viewer", "editor", "admin"].includes(role)
        ? role
        : "editor";

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role: assignedRole,
      orgId: organization._id,
    });

    // Add to org
    organization.members.push(user._id);
    await organization.save();

    const token = generateToken(user._id);

    return res.status(201).json({
      success: true,
      token,
      user: sanitizeUser(user),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Email and password are required." });
    }

    // Explicitly select password (it has select: false in schema)
    const user = await User.findOne({ email: email.toLowerCase() }).select(
      "+password"
    ).populate("orgId", "name plan");

    if (!user || !(await user.comparePassword(password))) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid email or password." });
    }

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: "Login successful.",
      token,
      user: sanitizeUser(user),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/auth/me
 * Returns the currently authenticated user
 */
const getMe = async (req, res, next) => {
  try {
    // req.user is attached by protect middleware
    res.status(200).json({
      success: true,
      user: sanitizeUser(req.user),
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, getMe };