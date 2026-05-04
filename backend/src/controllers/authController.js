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
const register = async (req, res, next) => {
  try {
    const { name, email, password, role, orgName, orgId } = req.body;

    // Basic validation
    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Name, email and password are required." });
    }

    // Check duplicate email
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res
        .status(409)
        .json({ success: false, message: "Email already registered." });
    }

    let organization;

    if (orgId) {
      // Join existing org
      organization = await Organization.findById(orgId);
      if (!organization) {
        return res
          .status(404)
          .json({ success: false, message: "Organization not found." });
      }
    } else {
      // Create new org
      const newOrgName = orgName || `${name}'s Organization`;
      organization = await Organization.create({ name: newOrgName });
    }

    // Determine role — first member of a new org becomes admin
    const assignedRole =
      organization.members.length === 0
        ? "admin"
        : role && ["viewer", "editor", "admin"].includes(role)
        ? role
        : "editor";

    
    console.log("here")
    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role: assignedRole,
      orgId: organization._id,
    });
    console.log(user)
    // Add user to org members
    organization.members.push(user._id);
    await organization.save();

    console.log("Saved")
    const token = generateToken(user._id);
    
    res.status(201).json({
      success: true,
      message: "Registration successful.",
      token,
      user: sanitizeUser(user),
    });

    console.log(res)
  } catch (err) {
    console.error("REGISTER ERROR:", err); // 👈 CRITICAL
    res.status(500).json({
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