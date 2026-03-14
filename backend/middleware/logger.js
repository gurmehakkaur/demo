// Logs every API call: method, endpoint, user role, timestamp
function apiLogger(req, res, next) {
  const role = req.user ? req.user.role : "UNAUTHENTICATED";
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.originalUrl}  role: ${role}`);
  next();
}

module.exports = { apiLogger };
