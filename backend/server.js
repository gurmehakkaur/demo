const express = require("express");
const cors    = require("cors");
const { apiLogger } = require("./middleware/logger");

const authRoutes    = require("./routes/auth");
const webinarRoutes = require("./routes/webinars");
const adminRoutes   = require("./routes/admin");

const app  = express();
const PORT = 3001;

// ── Global middleware ─────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// API logger runs AFTER body parsing so req.user can be set by auth middleware
// We attach a post-auth logger via a small trick: log after route handler sets req.user
// Instead, we log in a middleware that has access to headers/path:
app.use((req, res, next) => {
  // Decode JWT lazily just for logging (without blocking the request)
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    try {
      const jwt = require("jsonwebtoken");
      const { JWT_SECRET } = require("./middleware/auth");
      req.user = jwt.verify(header.split(" ")[1], JWT_SECRET);
    } catch { /* invalid token — auth route will handle it */ }
  }
  next();
});
app.use(apiLogger);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/auth",     authRoutes);
app.use("/webinars", webinarRoutes);
app.use("/admin",    adminRoutes);

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/health", (req, res) => res.json({ success: true, data: { status: "ok" } }));

// ── 404 fallback ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Route not found: ${req.method} ${req.path}` });
});

app.listen(PORT, () => {
  console.log(`\nBorderPass API running on http://localhost:${PORT}`);
  console.log("─".repeat(50));
  console.log("Seed accounts:");
  console.log("  admin@borderpass.com   / admin123   (ADMIN)");
  console.log("  host@borderpass.com    / host123    (HOST)");
  console.log("  student1@example.com   / student123 (STUDENT)");
  console.log("  student2@example.com   / student123 (STUDENT)");
  console.log("─".repeat(50) + "\n");
});
