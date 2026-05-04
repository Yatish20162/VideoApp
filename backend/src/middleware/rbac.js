/**
 * authorize(...roles) – role-based access control guard
 * Must be used AFTER protect middleware
 *
 * Usage:
 *   router.post("/upload", protect, authorize("editor", "admin"), handler)
 *   router.get("/users",   protect, authorize("admin"),           handler)
 */
const authorize = (...roles) => {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Not authenticated.",
        });
      }
  
      if (!roles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: `Role '${req.user.role}' is not allowed to perform this action. Required: ${roles.join(" or ")}.`,
        });
      }
  
      next();
    };
  };
  
  module.exports = { authorize };