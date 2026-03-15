const express = require("express");
const cors    = require("cors");
const { apiLogger } = require("./middleware/logger");
const { init }      = require("./db/seed");

const authRoutes    = require("./routes/auth");
const webinarRoutes = require("./routes/webinars");
const adminRoutes   = require("./routes/admin");

const app  = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Decode JWT for logger
app.use((req, res, next) => {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    try {
      const jwt = require("jsonwebtoken");
      const { JWT_SECRET } = require("./middleware/auth");
      req.user = jwt.verify(header.split(" ")[1], JWT_SECRET);
    } catch { /* invalid token — auth route will handle it */ }
  }
  next();
});
app.use(apiLogger);

app.use("/api/auth",     authRoutes);
app.use("/api/webinars", webinarRoutes);
app.use("/api/admin",    adminRoutes);

app.get("/health", (req, res) => res.json({ success: true, data: { status: "ok" } }));

app.use((req, res) => {
  res.status(404).json({ success: false, error: `Route not found: ${req.method} ${req.path}` });
});

// Connect to Elasticsearch, create indices, seed (if enabled) — then start HTTP server
init()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`\nBorderPass API running on http://localhost:${PORT}`);
      console.log("─".repeat(50));
      console.log("  admin@borderpass.com   / admin123   (ADMIN)");
      console.log("  host@borderpass.com    / host123    (HOST)");
      console.log("  student1@example.com   / student123 (STUDENT)");
      console.log("─".repeat(50) + "\n");
    });
  })
  .catch((err) => {
    console.error("Startup failed:", err.message);
    process.exit(1);
  });
