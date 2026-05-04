/**
 * Global error handling middleware
 * Must be registered LAST in app.js: app.use(errorHandler)
 */
const multer = require("multer");

const errorHandler = (err, req, res, next) => {
    let statusCode = err.statusCode || 500;
    let message = err.message || "Internal Server Error";
  
    // Mongoose bad ObjectId
    if (err.name === "CastError") {
      message = `Resource not found with id: ${err.value}`;
      statusCode = 404;
    }
  
    // Mongoose duplicate key
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue)[0];
      message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists.`;
      statusCode = 409;
    }
  
    // Mongoose validation error
    if (err.name === "ValidationError") {
      message = Object.values(err.errors)
        .map((e) => e.message)
        .join(". ");
      statusCode = 400;
    }
  
    // Multer file size error
    if (err.code === "LIMIT_FILE_SIZE") {
      message = `File too large. Maximum size is ${process.env.MAX_FILE_SIZE_MB || 500}MB.`;
      statusCode = 413;
    }
  
    // Multer unexpected field
    if (err.code === "LIMIT_UNEXPECTED_FILE") {
      message = "Unexpected file field. Use field name 'video'.";
      statusCode = 400;
    }
  
    if (process.env.NODE_ENV === "development") {
      console.error("❌ Error:", err);
    }

    if (err instanceof multer.MulterError) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }
  
    res.status(statusCode).json({
      success: false,
      message,
      ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    });
  };
  
  /**
   * Not found handler – catches any route that doesn't match
   */
  const notFound = (req, res, next) => {
    const err = new Error(`Route not found: ${req.originalUrl}`);
    err.statusCode = 404;
    next(err);
  };
  
  module.exports = { errorHandler, notFound };