import { Router } from "express";
import crypto from "crypto";
import { nanoid } from "nanoid";
import db from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { currentToken, secondsUntilNextRotation, ROTATE_SECONDS } from "../utils/qr.js";
import { computeSubjectReport, reportToCsv, csvFilename } from "../utils/report.js";

const router = Router();
router.use(requireAuth, requireRole("teacher"));

// --- Subjects -------------------------------------------------------------

router.post("/subjects", (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "name is required" });

  const code = nanoid(6).toUpperCase();
  const info = db
    .prepare("INSERT INTO subjects (name, code, teacher_id, department_id) VALUES (?, ?, ?, ?)")
    .run(name, code, req.user.id, req.user.department_id || null);

  res.json(db.prepare("SELECT * FROM subjects WHERE id = ?").get(info.lastInsertRowid));
});

router.get("/subjects", (req, res) => {
  const subjects = db
    .prepare(
      `SELECT s.*, (SELECT COUNT(*) FROM enrollments e WHERE e.subject_id = s.id) as student_count
       FROM subjects s WHERE s.teacher_id = ? ORDER BY s.created_at DESC`
    )
    .all(req.user.id);
  res.json(subjects);
});

router.get("/subjects/:id/students", (req, res) => {
  const subject = getOwnedSubject(req);
  if (!subject) return res.status(404).json({ error: "Subject not found" });

  const students = db
    .prepare(
      `SELECT u.id, u.name, u.roll_no, u.email FROM enrollments e
       JOIN users u ON u.id = e.student_id WHERE e.subject_id = ? ORDER BY u.roll_no`
    )
    .all(subject.id);
  res.json(students);
});

// --- Sessions ---------------------------------------------------------------

router.post("/sessions", (req, res) => {
  const { subject_id, latitude, longitude, radius_meters } = req.body;
  const subject = db
    .prepare("SELECT * FROM subjects WHERE id = ? AND teacher_id = ?")
    .get(subject_id, req.user.id);
  if (!subject) return res.status(404).json({ error: "Subject not found" });

  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return res.status(400).json({ error: "Classroom latitude/longitude are required" });
  }

  const active = db
    .prepare("SELECT id FROM sessions WHERE subject_id = ? AND status = 'active'")
    .get(subject_id);
  if (active) return res.status(409).json({ error: "A session is already active for this subject" });

  const secret = crypto.randomBytes(16).toString("hex");
  const radius = radius_meters === 0 || radius_meters === "0" ? 0 : Number(radius_meters) || 40;
  const info = db
    .prepare(
      `INSERT INTO sessions (subject_id, teacher_id, secret, latitude, longitude, radius_meters)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(subject_id, req.user.id, secret, latitude, longitude, radius);

  res.json(db.prepare("SELECT * FROM sessions WHERE id = ?").get(info.lastInsertRowid));
});

router.get("/sessions/:id/qr", (req, res) => {
  const session = getOwnedSession(req);
  if (!session) return res.status(404).json({ error: "Session not found" });
  if (session.status !== "active") return res.status(409).json({ error: "Session has ended" });

  res.json({
    sessionId: session.id,
    token: currentToken(session.secret),
    rotateSeconds: ROTATE_SECONDS,
    secondsUntilNextRotation: secondsUntilNextRotation(),
  });
});

router.get("/sessions/:id/live", (req, res) => {
  const session = getOwnedSession(req);
  if (!session) return res.status(404).json({ error: "Session not found" });

  const present = db
    .prepare(
      `SELECT u.name, u.roll_no, a.marked_at, a.distance_meters, a.gps_accuracy FROM attendance a
       JOIN users u ON u.id = a.student_id
       WHERE a.session_id = ? AND a.status = 'present' ORDER BY a.marked_at`
    )
    .all(session.id);

  const totalEnrolled = db
    .prepare("SELECT COUNT(*) as c FROM enrollments WHERE subject_id = ?")
    .get(session.subject_id).c;

  res.json({ session, present, totalEnrolled, presentCount: present.length });
});

router.post("/sessions/:id/end", (req, res) => {
  const session = getOwnedSession(req);
  if (!session) return res.status(404).json({ error: "Session not found" });
  if (session.status === "ended") return res.status(409).json({ error: "Session already ended" });

  db.prepare("UPDATE sessions SET status = 'ended', ended_at = datetime('now') WHERE id = ?").run(session.id);

  // Anyone enrolled but with no attendance record is marked absent.
  const enrolled = db
    .prepare("SELECT student_id FROM enrollments WHERE subject_id = ?")
    .all(session.subject_id);
  const alreadyMarked = new Set(
    db
      .prepare("SELECT student_id FROM attendance WHERE session_id = ?")
      .all(session.id)
      .map((r) => r.student_id)
  );

  const insertAbsent = db.prepare(
    "INSERT INTO attendance (session_id, student_id, status) VALUES (?, ?, 'absent')"
  );
  const tx = db.transaction((rows) => {
    for (const row of rows) {
      if (!alreadyMarked.has(row.student_id)) {
        insertAbsent.run(session.id, row.student_id);
      }
    }
  });
  tx(enrolled);

  res.json({ ok: true });
});

router.get("/sessions/:id/report", (req, res) => {
  const session = getOwnedSession(req);
  if (!session) return res.status(404).json({ error: "Session not found" });

  const rows = db
    .prepare(
      `SELECT u.name, u.roll_no, a.status, a.marked_at, a.distance_meters, a.gps_accuracy
       FROM attendance a JOIN users u ON u.id = a.student_id
       WHERE a.session_id = ? ORDER BY u.roll_no`
    )
    .all(session.id);

  res.json({ session, rows });
});

router.get("/subjects/:id/sessions", (req, res) => {
  const subject = getOwnedSubject(req);
  if (!subject) return res.status(404).json({ error: "Subject not found" });

  const sessions = db
    .prepare(
      `SELECT s.*,
        (SELECT COUNT(*) FROM attendance a WHERE a.session_id = s.id AND a.status='present') as present_count,
        (SELECT COUNT(*) FROM attendance a WHERE a.session_id = s.id AND a.status='absent') as absent_count
       FROM sessions s WHERE s.subject_id = ? ORDER BY s.started_at DESC`
    )
    .all(subject.id);

  res.json(sessions);
});

router.get("/subjects/:id/attendance-report", (req, res) => {
  const subject = getOwnedSubject(req);
  if (!subject) return res.status(404).json({ error: "Subject not found" });

  const report = computeSubjectReport(subject.id);
  res.json(report);
});

router.get("/subjects/:id/attendance-report.csv", (req, res) => {
  const subject = getOwnedSubject(req);
  if (!subject) return res.status(404).json({ error: "Subject not found" });

  const report = computeSubjectReport(subject.id);
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="${csvFilename(subject.name)}"`);
  res.send(reportToCsv(report));
});

// --- helpers ----------------------------------------------------------------

function getOwnedSubject(req) {
  return db
    .prepare("SELECT * FROM subjects WHERE id = ? AND teacher_id = ?")
    .get(req.params.id, req.user.id);
}

function getOwnedSession(req) {
  return db
    .prepare("SELECT * FROM sessions WHERE id = ? AND teacher_id = ?")
    .get(req.params.id, req.user.id);
}

export default router;
