const express = require("express");
const { ObjectId } = require("mongodb");
const { authenticate, authorize } = require("../middleware/auth");
const { db } = require("../db/client");

const router = express.Router();

// ── Helpers ───────────────────────────────────────────────────────────────────

function toObj(doc) {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return { id: _id.toString(), ...rest };
}

async function withHost(doc) {
  const w = toObj(doc);
  const host = await db.collection("users").findOne({ id: w.host_id });
  return { ...w, host_name: host?.name || "Unknown" };
}

function parseId(id) {
  try { return new ObjectId(id); } catch { return null; }
}

async function getWebinar(id, res) {
  const oid = parseId(id);
  if (!oid) { res.status(404).json({ success: false, error: "Invalid webinar ID" }); return null; }
  const doc = await db.collection("webinars").findOne({ _id: oid });
  if (!doc) { res.status(404).json({ success: false, error: "Webinar not found" }); return null; }
  return withHost(doc);
}

async function setStatus(id, status) {
  await db.collection("webinars").updateOne({ _id: parseId(id) }, { $set: { status } });
}

// ── GET /webinars ─────────────────────────────────────────────────────────────
router.get("/", authenticate, async (req, res) => {
  try {
    let filter = {};
    if (req.user.role === "STUDENT") filter = { status: { $in: ["SCHEDULED", "LIVE", "COMPLETED"] } };
    if (req.user.role === "HOST")    filter = { host_id: req.user.id };

    const docs = await db.collection("webinars").find(filter).toArray();
    res.json({ success: true, data: await Promise.all(docs.map(withHost)) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /webinars/:id ─────────────────────────────────────────────────────────
router.get("/:id", authenticate, async (req, res) => {
  try {
    const webinar = await getWebinar(req.params.id, res);
    if (webinar) res.json({ success: true, data: webinar });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /webinars — HOST creates ─────────────────────────────────────────────
router.post("/", authenticate, authorize("HOST"), async (req, res) => {
  try {
    const { title, description, scheduled_time } = req.body;
    if (!title || !scheduled_time)
      return res.status(400).json({ success: false, error: "title and scheduled_time are required" });

    const doc = {
      title,
      description: description || "",
      host_id: req.user.id,
      scheduled_time: new Date(scheduled_time),
      status: "DRAFT",
    };
    const result = await db.collection("webinars").insertOne(doc);
    res.status(201).json({ success: true, data: withHost({ _id: result.insertedId, ...doc }) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── PATCH /webinars/:id — HOST edits ──────────────────────────────────────────
router.patch("/:id", authenticate, authorize("HOST"), async (req, res) => {
  try {
    const webinar = await getWebinar(req.params.id, res);
    if (!webinar) return;
    if (webinar.host_id !== req.user.id)
      return res.status(403).json({ success: false, error: "You can only edit your own webinars" });
    if (webinar.status !== "DRAFT")
      return res.status(400).json({ success: false, error: "Only DRAFT webinars can be edited" });

    const updates = {};
    if (req.body.title)          updates.title = req.body.title;
    if (req.body.description)    updates.description = req.body.description;
    if (req.body.scheduled_time) updates.scheduled_time = new Date(req.body.scheduled_time);

    await db.collection("webinars").updateOne({ _id: parseId(req.params.id) }, { $set: updates });
    const updated = await getWebinar(req.params.id, res);
    if (updated) res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Status transition routes ───────────────────────────────────────────────────

router.post("/:id/submit", authenticate, authorize("HOST"), async (req, res) => {
  try {
    const w = await getWebinar(req.params.id, res);
    if (!w) return;
    if (w.host_id !== req.user.id) return res.status(403).json({ success: false, error: "Not your webinar" });
    if (w.status !== "DRAFT") return res.status(400).json({ success: false, error: `Cannot submit. Status: ${w.status}` });
    await setStatus(req.params.id, "PENDING_APPROVAL");
    res.json({ success: true, data: { ...w, status: "PENDING_APPROVAL" } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post("/:id/approve", authenticate, authorize("ADMIN"), async (req, res) => {
  try {
    const w = await getWebinar(req.params.id, res);
    if (!w) return;
    if (w.status !== "PENDING_APPROVAL") return res.status(400).json({ success: false, error: `Cannot approve. Status: ${w.status}` });
    await setStatus(req.params.id, "SCHEDULED");
    res.json({ success: true, data: { ...w, status: "SCHEDULED" } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post("/:id/reject", authenticate, authorize("ADMIN"), async (req, res) => {
  try {
    const w = await getWebinar(req.params.id, res);
    if (!w) return;
    if (w.status !== "PENDING_APPROVAL") return res.status(400).json({ success: false, error: `Cannot reject. Status: ${w.status}` });
    await setStatus(req.params.id, "CANCELLED");
    res.json({ success: true, data: { ...w, status: "CANCELLED" } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post("/:id/start", authenticate, authorize("HOST"), async (req, res) => {
  try {
    const w = await getWebinar(req.params.id, res);
    if (!w) return;
    if (w.host_id !== req.user.id) return res.status(403).json({ success: false, error: "Not your webinar" });
    if (w.status !== "SCHEDULED") return res.status(400).json({ success: false, error: `Cannot start. Status: ${w.status}` });
    await setStatus(req.params.id, "LIVE");
    res.json({ success: true, data: { ...w, status: "LIVE" } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post("/:id/cancel", authenticate, authorize("ADMIN"), async (req, res) => {
  try {
    const w = await getWebinar(req.params.id, res);
    if (!w) return;
    if (["COMPLETED", "CANCELLED"].includes(w.status)) return res.status(400).json({ success: false, error: `Cannot cancel. Status: ${w.status}` });
    await setStatus(req.params.id, "CANCELLED");
    res.json({ success: true, data: { ...w, status: "CANCELLED" } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ── POST /webinars/:id/register ───────────────────────────────────────────────
router.post("/:id/register", authenticate, authorize("STUDENT"), async (req, res) => {
  try {
    const w = await getWebinar(req.params.id, res);
    if (!w) return;
    if (!["SCHEDULED", "LIVE"].includes(w.status))
      return res.status(400).json({ success: false, error: `Cannot register. Status: ${w.status}` });

    const existing = await db.collection("registrations").findOne({
      webinar_id: req.params.id, student_id: req.user.id, status: "REGISTERED",
    });
    if (existing) return res.status(409).json({ success: false, error: "Already registered" });

    const result = await db.collection("registrations").insertOne({
      webinar_id: req.params.id, student_id: req.user.id, status: "REGISTERED",
    });
    res.status(201).json({ success: true, data: { id: result.insertedId, webinar_id: req.params.id, student_id: req.user.id, status: "REGISTERED" } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ── POST /webinars/:id/unregister ─────────────────────────────────────────────
router.post("/:id/unregister", authenticate, authorize("STUDENT"), async (req, res) => {
  try {
    const result = await db.collection("registrations").findOneAndUpdate(
      { webinar_id: req.params.id, student_id: req.user.id, status: "REGISTERED" },
      { $set: { status: "CANCELLED" } }
    );
    if (!result) return res.status(404).json({ success: false, error: "No active registration found" });
    res.json({ success: true, data: { id: result._id, status: "CANCELLED" } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ── GET /webinars/:id/attendees ───────────────────────────────────────────────
router.get("/:id/attendees", authenticate, authorize("HOST", "ADMIN"), async (req, res) => {
  try {
    const webinar = await getWebinar(req.params.id, res);
    if (!webinar) return;
    if (req.user.role === "HOST" && webinar.host_id !== req.user.id)
      return res.status(403).json({ success: false, error: "Not your webinar" });

    const regs = await db.collection("registrations").find({ webinar_id: req.params.id, status: "REGISTERED" }).toArray();
    const attendees = await Promise.all(regs.map(async (r) => {
      const student = await db.collection("users").findOne({ id: r.student_id });
      return { registration_id: r._id, student_id: r.student_id, name: student?.name, email: student?.email };
    }));
    res.json({ success: true, data: { webinar, attendees } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

module.exports = router;
