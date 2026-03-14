const jwt = require("jsonwebtoken");

const JWT_SECRET = "borderpass-demo-secret-2026";

// Verify JWT and attach req.user
function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, error: "Missing or malformed Authorization header" });
  }
  const token = header.split(" ")[1];
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ success: false, error: "Invalid or expired token" });
  }
}

// Role gate — usage: authorize("ADMIN", "HOST")
function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Forbidden. Required role(s): ${roles.join(", ")}. Your role: ${req.user.role}`,
      });
    }
    next();
  };
}

module.exports = { authenticate, authorize, JWT_SECRET };
