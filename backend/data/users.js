// Hardcoded users — no database
const users = [
  { id: 1, name: "Admin User",     email: "admin@borderpass.com",    password: "admin123",   role: "ADMIN"   },
  { id: 2, name: "Sarah Chen",     email: "host@borderpass.com",     password: "host123",    role: "HOST"    },
  { id: 3, name: "John Doe",       email: "student1@example.com",    password: "student123", role: "STUDENT" },
  { id: 4, name: "Jane Smith",     email: "student2@example.com",    password: "student123", role: "STUDENT" },
];

module.exports = { users };
