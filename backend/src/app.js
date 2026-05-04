require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const path = require("path");
const jwt = require("jsonwebtoken");

const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const videoRoutes = require("./routes/videoRoutes");
const userRoutes = require("./routes/userRoutes");
const { errorHandler, notFound } = require("./middleware/errorHandler");
const { setIO } = require("./controllers/videoController");

// ── Bootstrap ────────────────────────────────────────────────────────────────
const app = express();
const server = http.createServer(app);

// ── Socket.io setup ──────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
  // Reconnection handled client-side; server stays stateless
  pingTimeout: 60000,
  pingInterval: 25000,
});

/**
 * Socket.io authentication middleware
 * Client must send token in handshake: socket.auth = { token }
 * We attach socket.userId so we can put them in a private room.
 */
io.use((socket, next) => {
  const token =
    socket.handshake.auth?.token ||
    socket.handshake.headers?.authorization?.split(" ")[1];

  if (!token) {
    // Allow unauthenticated connections but without a room
    socket.userId = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    next();
  } catch {
    // Invalid token — allow connection but no private room
    socket.userId = null;
    next();
  }
});

io.on("connection", (socket) => {
  console.log(`🔌 Socket connected: ${socket.id} (user: ${socket.userId || "anon"})`);

  if (socket.userId) {
    // Join a private room keyed by userId
    // Processing events are emitted to "user:<userId>"
    socket.join(`user:${socket.userId}`);
    console.log(`   → Joined room user:${socket.userId}`);
  }

  // Client can also call authenticate post-connect (e.g. if token wasn't ready at handshake)
  socket.on("authenticate", (token) => {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      socket.join(`user:${decoded.id}`);
      socket.emit("authenticated", { success: true, userId: decoded.id });
      console.log(`   → Late auth: ${socket.id} joined user:${decoded.id}`);
    } catch {
      socket.emit("authenticated", { success: false, message: "Invalid token" });
    }
  });

  socket.on("disconnect", (reason) => {
    console.log(`🔌 Socket disconnected: ${socket.id} (${reason})`);
  });
});

// Inject io into video controller so processVideo can emit events
setIO(io);

// ── Express middleware ────────────────────────────────────────────────────────
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ── Health check ─────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || "development",
  });
});

// ── API routes ───────────────────────────────────────────────────────────────
app.use("/api/auth",   authRoutes);
app.use("/api/videos", videoRoutes);
app.use("/api/users",  userRoutes);

// ── 404 + global error handler ───────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── Start server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`\n🚀 Server running on port ${PORT}`);
    console.log(`   Environment : ${process.env.NODE_ENV || "development"}`);
    console.log(`   Frontend URL: ${process.env.FRONTEND_URL || "http://localhost:5173"}`);
    console.log(`   Health check: http://localhost:${PORT}/health\n`);
  });
});

// ── Graceful shutdown ─────────────────────────────────────────────────────────
process.on("SIGTERM", () => {
  console.log("SIGTERM received. Closing server...");
  server.close(() => {
    console.log("Server closed.");
    process.exit(0);
  });
});

module.exports = { app, server, io };