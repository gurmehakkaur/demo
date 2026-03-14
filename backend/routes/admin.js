const express = require("express");
const { authenticate, authorize } = require("../middleware/auth");
const { db } = require("../db/client");

const router = express.Router();

router.get("/webinars", authenticate, authorize("ADMIN"), async (req, res) => {
  try {
    const webinars = await db.collection("webinars").find({}).toArray();

    const result = await Promise.all(
      webinars.map(async (w) => {
        const host = await db.collection("users").findOne({ id: w.host_id });
        const [attendee_count, waitlist_count] = await Promise.all([
          db.collection("registrations").countDocuments({ webinar_id: w._id.toString(), status: "REGISTERED" }),
          db.collection("registrations").countDocuments({ webinar_id: w._id.toString(), status: "WAITLISTED" }),
        ]);
        return { id: w._id.toString(), ...w, _id: undefined, host_name: host?.name || "Unknown", attendee_count, waitlist_count };
      })
    );

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
