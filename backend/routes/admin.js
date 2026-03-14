const express = require("express");
const { authenticate, authorize } = require("../middleware/auth");
const { users } = require("../data/users");
const { db } = require("../db/client");

const router = express.Router();

router.get("/webinars", authenticate, authorize("ADMIN"), async (req, res) => {
  try {
    const webinars = await db.collection("webinars").find({}).toArray();

    const result = await Promise.all(
      webinars.map(async (w) => {
        const host = users.find((u) => u.id === w.host_id);
        const attendee_count = await db.collection("registrations").countDocuments({
          webinar_id: w._id.toString(), status: "REGISTERED",
        });
        return { id: w._id.toString(), ...w, _id: undefined, host_name: host?.name || "Unknown", attendee_count };
      })
    );

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
