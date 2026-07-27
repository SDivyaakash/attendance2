import { Router } from "express";
import db from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { isTokenValid } from "../utils/qr.js";
import { distanceMeters } from "../utils/geo.js";

const router = Router();
router.use(requireAuth, requireRole("student"));

router.post("/enroll", (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: "Subject code is required" });

  const subject = db.prepare("SELECT * FROM subjects WHERE code = ?").get(code.toUpperCase());
  if (!subject) return res.status(404).json({ error: "No subject found with that code" });

  const existing = db
    .prepare("SELECT id FROM enrollments WHERE subject_id = ? AND student_id = ?")
    .get(subject.id, req.user.id);
  if (existing) return res.status(409).json({ error: "Already enrolled in this subject" });

  db.prepare("INSERT INTO enrollments (subject_id, student_id) VALUES (?, ?)").run(
    subject.id,
    req.user.id
  );
  res.json(subject);
});

router.get("/subjects", (req, res) => {
  const subjects = db
    .prepare(
      `SELECT s.*, u.name as teacher_name,
        (SELECT id FROM sessions ss WHERE ss.subject_id = s.id AND ss.status='active') as active_session_id
       FROM enrollments e
       JOIN subjects s ON s.id = e.subject_id
       JOIN users u ON u.id = s.teacher_id
       WHERE e.student_id = ? ORDER BY s.name`
    )
    .all(req.user.id);
  res.json(subjects);
});

router.post("/mark-attendance", (req, res) => {
  const { sessionId, token, latitude, longitude, accuracy } = req.body;

  if (!sessionId || !token) {
    return res.status(400).json({ error: "Scan a QR code to mark attendance" });
  }
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return res.status(400).json({ error: "Location access is required to mark attendance" });
  }

  const session = db.prepare("SELECT * FROM sessions WHERE id = ?").get(sessionId);
  if (!session) return res.status(404).json({ error: "Session not found" });
  if (session.status !== "active") {
    return res.status(409).json({ error: "This class session has ended" });
  }

  const enrolled = db
    .prepare("SELECT id FROM enrollments WHERE subject_id = ? AND student_id = ?")
    .get(session.subject_id, req.user.id);
  if (!enrolled) {
    return res.status(403).json({ error: "You are not enrolled in this subject" });
  }

  const already = db
    .prepare("SELECT id FROM attendance WHERE session_id = ? AND student_id = ?")
    .get(session.id, req.user.id);
  if (already) {
    return res.status(409).json({ error: "Attendance already marked for this session" });
  }

  if (!isTokenValid(session.secret, token)) {
    return res.status(400).json({
      error: "QR code expired or invalid — ask your teacher for the current code and scan again",
    });
  }

  const distance = distanceMeters(session.latitude, session.longitude, latitude, longitude);
  const locationCheckEnabled = session.radius_meters > 0;
  if (locationCheckEnabled && distance > session.radius_meters) {
    return res.status(403).json({
      error: `You appear to be ${Math.round(distance)}m from the classroom (limit ${session.radius_meters}m). Attendance not marked.`,
      distance: Math.round(distance),
      accuracy: typeof accuracy === "number" ? Math.round(accuracy) : null,
    });
  }

  db.prepare(
    "INSERT INTO attendance (session_id, student_id, status, distance_meters, gps_accuracy) VALUES (?, ?, 'present', ?, ?)"
  ).run(session.id, req.user.id, distance, typeof accuracy === "number" ? accuracy : null);

  res.json({
    ok: true,
    status: "present",
    distance: Math.round(distance),
    accuracy: typeof accuracy === "number" ? Math.round(accuracy) : null,
  });
});

router.get("/subjects/:id/attendance", (req, res) => {
  const subject = db
    .prepare(
      `SELECT s.* FROM subjects s JOIN enrollments e ON e.subject_id = s.id
       WHERE s.id = ? AND e.student_id = ?`
    )
    .get(req.params.id, req.user.id);
  if (!subject) return res.status(404).json({ error: "Subject not found" });

  const rows = db
    .prepare(
      `SELECT a.status, a.marked_at, s.started_at FROM attendance a
       JOIN sessions s ON s.id = a.session_id
       WHERE s.subject_id = ? AND a.student_id = ? ORDER BY s.started_at DESC`
    )
    .all(subject.id, req.user.id);

  const present = rows.filter((r) => r.status === "present").length;
  const total = rows.length;
  const percentage = total ? Math.round((present / total) * 1000) / 10 : null;

  res.json({ subject, rows, present, total, percentage });
});

export default router;
