const express = require("express");
const { authenticate, authorize } = require("../middleware/auth");
const { webinars, registrations } = require("../data/webinars");
const { users } = require("../data/users");

const router = express.Router();

// GET /admin/webinars — all webinars with attendee counts
router.get("/webinars", authenticate, authorize("ADMIN"), (req, res) => {
  const list = webinars.map((w) => {
    const host = users.find((u) => u.id === w.host_id);
    const attendee_count = registrations.filter(
      (r) => r.webinar_id === w.id && r.status === "REGISTERED"
    ).length;
    return { ...w, host_name: host?.name, attendee_count };
  });

  return res.json({ success: true, data: list });
});

module.exports = router;
