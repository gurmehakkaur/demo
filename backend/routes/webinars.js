const express = require("express");
const { authenticate, authorize } = require("../middleware/auth");
const { webinars, registrations, getNextWebinarId, getNextRegistrationId } = require("../data/webinars");
const { users } = require("../data/users");

const router = express.Router();

// ── Helpers ──────────────────────────────────────────────────────────────────

function findWebinar(id, res) {
  const w = webinars.find((w) => w.id === parseInt(id));
  if (!w) { res.status(404).json({ success: false, error: "Webinar not found" }); return null; }
  return w;
}

function withHost(webinar) {
  const host = users.find((u) => u.id === webinar.host_id);
  return { ...webinar, host_name: host ? host.name : "Unknown" };
}

// ── GET /webinars ─────────────────────────────────────────────────────────────
router.get("/", authenticate, (req, res) => {
  let list = webinars.map(withHost);

  // Students only see SCHEDULED, LIVE, COMPLETED
  if (req.user.role === "STUDENT") {
    list = list.filter((w) => ["SCHEDULED", "LIVE", "COMPLETED"].includes(w.status));
  }
  // Host sees their own webinars
  if (req.user.role === "HOST") {
    list = list.filter((w) => w.host_id === req.user.id);
  }

  return res.json({ success: true, data: list });
});

// ── GET /webinars/:id ─────────────────────────────────────────────────────────
router.get("/:id", authenticate, (req, res) => {
  const w = findWebinar(req.params.id, res);
  if (!w) return;
  return res.json({ success: true, data: withHost(w) });
});

// ── POST /webinars — HOST creates a webinar ───────────────────────────────────
router.post("/", authenticate, authorize("HOST"), (req, res) => {
  const { title, description, scheduled_time } = req.body;
  if (!title || !scheduled_time) {
    return res.status(400).json({ success: false, error: "title and scheduled_time are required" });
  }

  const webinar = {
    id: getNextWebinarId(),
    title,
    description: description || "",
    host_id: req.user.id,
    scheduled_time,
    status: "DRAFT",
  };

  webinars.push(webinar);
  return res.status(201).json({ success: true, data: withHost(webinar) });
});

// ── PATCH /webinars/:id — HOST edits a webinar ────────────────────────────────
router.patch("/:id", authenticate, authorize("HOST"), (req, res) => {
  const w = findWebinar(req.params.id, res);
  if (!w) return;

  if (w.host_id !== req.user.id) {
    return res.status(403).json({ success: false, error: "You can only edit your own webinars" });
  }
  if (!["DRAFT"].includes(w.status)) {
    return res.status(400).json({ success: false, error: "Only DRAFT webinars can be edited" });
  }

  const { title, description, scheduled_time } = req.body;
  if (title)          w.title = title;
  if (description)    w.description = description;
  if (scheduled_time) w.scheduled_time = scheduled_time;

  return res.json({ success: true, data: withHost(w) });
});

// ── POST /webinars/:id/submit — HOST submits for approval ────────────────────
router.post("/:id/submit", authenticate, authorize("HOST"), (req, res) => {
  const w = findWebinar(req.params.id, res);
  if (!w) return;

  if (w.host_id !== req.user.id) {
    return res.status(403).json({ success: false, error: "You can only submit your own webinars" });
  }
  if (w.status !== "DRAFT") {
    return res.status(400).json({ success: false, error: `Cannot submit. Current status: ${w.status}` });
  }

  w.status = "PENDING_APPROVAL";
  return res.json({ success: true, data: withHost(w) });
});

// ── POST /webinars/:id/approve — ADMIN approves ───────────────────────────────
router.post("/:id/approve", authenticate, authorize("ADMIN"), (req, res) => {
  const w = findWebinar(req.params.id, res);
  if (!w) return;

  if (w.status !== "PENDING_APPROVAL") {
    return res.status(400).json({ success: false, error: `Cannot approve. Current status: ${w.status}` });
  }

  w.status = "SCHEDULED";
  return res.json({ success: true, data: withHost(w) });
});

// ── POST /webinars/:id/reject — ADMIN rejects ────────────────────────────────
router.post("/:id/reject", authenticate, authorize("ADMIN"), (req, res) => {
  const w = findWebinar(req.params.id, res);
  if (!w) return;

  if (w.status !== "PENDING_APPROVAL") {
    return res.status(400).json({ success: false, error: `Cannot reject. Current status: ${w.status}` });
  }

  w.status = "CANCELLED";
  return res.json({ success: true, data: withHost(w) });
});

// ── POST /webinars/:id/start — HOST starts ────────────────────────────────────
router.post("/:id/start", authenticate, authorize("HOST"), (req, res) => {
  const w = findWebinar(req.params.id, res);
  if (!w) return;

  if (w.host_id !== req.user.id) {
    return res.status(403).json({ success: false, error: "You can only start your own webinars" });
  }
  if (w.status !== "SCHEDULED") {
    return res.status(400).json({ success: false, error: `Cannot start. Current status: ${w.status}` });
  }

  w.status = "LIVE";
  return res.json({ success: true, data: withHost(w) });
});

// ── POST /webinars/:id/cancel — ADMIN cancels ────────────────────────────────
router.post("/:id/cancel", authenticate, authorize("ADMIN"), (req, res) => {
  const w = findWebinar(req.params.id, res);
  if (!w) return;

  if (["COMPLETED", "CANCELLED"].includes(w.status)) {
    return res.status(400).json({ success: false, error: `Cannot cancel. Current status: ${w.status}` });
  }

  w.status = "CANCELLED";
  return res.json({ success: true, data: withHost(w) });
});

// ── POST /webinars/:id/register — STUDENT registers ──────────────────────────
router.post("/:id/register", authenticate, authorize("STUDENT"), (req, res) => {
  const w = findWebinar(req.params.id, res);
  if (!w) return;

  if (!["SCHEDULED", "LIVE"].includes(w.status)) {
    return res.status(400).json({ success: false, error: `Cannot register. Webinar status: ${w.status}` });
  }

  const existing = registrations.find(
    (r) => r.webinar_id === w.id && r.student_id === req.user.id && r.status === "REGISTERED"
  );
  if (existing) {
    return res.status(409).json({ success: false, error: "Already registered for this webinar" });
  }

  const reg = {
    id: getNextRegistrationId(),
    webinar_id: w.id,
    student_id: req.user.id,
    status: "REGISTERED",
  };
  registrations.push(reg);

  return res.status(201).json({ success: true, data: reg });
});

// ── POST /webinars/:id/unregister — STUDENT cancels ──────────────────────────
router.post("/:id/unregister", authenticate, authorize("STUDENT"), (req, res) => {
  const w = findWebinar(req.params.id, res);
  if (!w) return;

  const reg = registrations.find(
    (r) => r.webinar_id === w.id && r.student_id === req.user.id && r.status === "REGISTERED"
  );
  if (!reg) {
    return res.status(404).json({ success: false, error: "No active registration found" });
  }

  reg.status = "CANCELLED";
  return res.json({ success: true, data: reg });
});

// ── GET /webinars/:id/attendees — HOST or ADMIN ───────────────────────────────
router.get("/:id/attendees", authenticate, authorize("HOST", "ADMIN"), (req, res) => {
  const w = findWebinar(req.params.id, res);
  if (!w) return;

  if (req.user.role === "HOST" && w.host_id !== req.user.id) {
    return res.status(403).json({ success: false, error: "You can only view attendees for your own webinars" });
  }

  const activeRegs = registrations.filter((r) => r.webinar_id === w.id && r.status === "REGISTERED");
  const attendees = activeRegs.map((r) => {
    const student = users.find((u) => u.id === r.student_id);
    return { registration_id: r.id, student_id: r.student_id, name: student?.name, email: student?.email };
  });

  return res.json({ success: true, data: { webinar: withHost(w), attendees } });
});

module.exports = router;
