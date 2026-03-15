const express = require("express");
const jwt = require("jsonwebtoken");
const { db } = require("../db/client");
const { JWT_SECRET } = require("../middleware/auth");

const router = express.Router();

// GET /api/auth/users - Get all users for profile selection (no auth required)
router.get("/users", async (req, res) => {
  const users = await db.collection("users").find({}).toArray();
  const usersList = users.map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role
  }));
  return res.json({
    success: true,
    data: usersList
  });
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ success: false, error: "email and password are required" });

  const user = await db.collection("users").findOne({ email, password });
  if (!user)
    return res.status(401).json({ success: false, error: "Invalid credentials" });

  const token = jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: "8h" }
  );

  return res.json({
    success: true,
    data: { token, user: { id: user.id, name: user.name, email: user.email, role: user.role } },
  });
});

module.exports = router;
