import { Router } from "express";
import db from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { computeSubjectReport, reportToCsv, csvFilename, computeDepartmentOverview } from "../utils/report.js";

const router = Router();
router.use(requireAuth, requireRole("hod"));

function ensureDepartment(req, res) {
  if (!req.user.department_id) {
    res.status(400).json({ error: "Your account isn't assigned to a department" });
    return null;
  }
  return req.user.department_id;
}

router.get("/overview", (req, res) => {
  const departmentId = ensureDepartment(req, res);
  if (!departmentId) return;

  const overview = computeDepartmentOverview(departmentId);
  res.json(overview);
});

router.get("/subjects/:id/attendance-report", (req, res) => {
  const departmentId = ensureDepartment(req, res);
  if (!departmentId) return;

  const subject = db
    .prepare("SELECT * FROM subjects WHERE id = ? AND department_id = ?")
    .get(req.params.id, departmentId);
  if (!subject) return res.status(404).json({ error: "Subject not found in your department" });

  res.json(computeSubjectReport(subject.id));
});

router.get("/subjects/:id/attendance-report.csv", (req, res) => {
  const departmentId = ensureDepartment(req, res);
  if (!departmentId) return;

  const subject = db
    .prepare("SELECT * FROM subjects WHERE id = ? AND department_id = ?")
    .get(req.params.id, departmentId);
  if (!subject) return res.status(404).json({ error: "Subject not found in your department" });

  const report = computeSubjectReport(subject.id);
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="${csvFilename(subject.name)}"`);
  res.send(reportToCsv(report));
});

// --- Session-level attendance management ------------------------------------
// HODs can view and correct individual students' attendance for any session
// run within their own department (e.g. a student's scan failed to go
// through, or a genuine mistake needs fixing).

function getOwnedSubject(req, res) {
  const departmentId = ensureDepartment(req, res);
  if (!departmentId) return null;
  const subject = db
    .prepare("SELECT * FROM subjects WHERE id = ? AND department_id = ?")
    .get(req.params.id, departmentId);
  if (!subject) {
    res.status(404).json({ error: "Subject not found in your department" });
    return null;
  }
  return subject;
}

function getOwnedSession(req, res) {
  const departmentId = ensureDepartment(req, res);
  if (!departmentId) return null;
  const session = db
    .prepare(
      `SELECT se.* FROM sessions se
       JOIN subjects s ON s.id = se.subject_id
       WHERE se.id = ? AND s.department_id = ?`
    )
    .get(req.params.id, departmentId);
  if (!session) {
    res.status(404).json({ error: "Session not found in your department" });
    return null;
  }
  return session;
}

router.get("/subjects/:id/sessions", (req, res) => {
  const subject = getOwnedSubject(req, res);
  if (!subject) return;

  const sessions = db
    .prepare(
      `SELECT se.*,
        (SELECT COUNT(*) FROM attendance a WHERE a.session_id = se.id AND a.status = 'present') as present_count,
        (SELECT COUNT(*) FROM attendance a WHERE a.session_id = se.id AND a.status = 'absent') as absent_count
       FROM sessions se WHERE se.subject_id = ? ORDER BY se.started_at DESC`
    )
    .all(subject.id);

  res.json({ subject, sessions });
});

router.get("/sessions/:id/roster", (req, res) => {
  const session = getOwnedSession(req, res);
  if (!session) return;

  const subject = db.prepare("SELECT * FROM subjects WHERE id = ?").get(session.subject_id);

  const roster = db
    .prepare(
      `SELECT u.id as student_id, u.name, u.roll_no,
        a.status, a.is_manual,
        (SELECT name FROM users WHERE id = a.marked_by_user_id) as marked_by_name
       FROM enrollments e
       JOIN users u ON u.id = e.student_id
       LEFT JOIN attendance a ON a.session_id = ? AND a.student_id = u.id
       WHERE e.subject_id = ? ORDER BY u.roll_no`
    )
    .all(session.id, session.subject_id);

  res.json({ session, subject, roster });
});

router.post("/sessions/:id/attendance", (req, res) => {
  const session = getOwnedSession(req, res);
  if (!session) return;

  const { student_id, status } = req.body;
  if (!["present", "absent"].includes(status)) {
    return res.status(400).json({ error: "status must be 'present' or 'absent'" });
  }

  const enrolled = db
    .prepare("SELECT id FROM enrollments WHERE subject_id = ? AND student_id = ?")
    .get(session.subject_id, student_id);
  if (!enrolled) {
    return res.status(400).json({ error: "That student isn't enrolled in this subject" });
  }

  const existing = db
    .prepare("SELECT id FROM attendance WHERE session_id = ? AND student_id = ?")
    .get(session.id, student_id);

  if (existing) {
    db.prepare(
      `UPDATE attendance SET status = ?, is_manual = 1, marked_by_user_id = ?, marked_at = datetime('now')
       WHERE id = ?`
    ).run(status, req.user.id, existing.id);
  } else {
    db.prepare(
      `INSERT INTO attendance (session_id, student_id, status, is_manual, marked_by_user_id)
       VALUES (?, ?, ?, 1, ?)`
    ).run(session.id, student_id, status, req.user.id);
  }

  res.json({ ok: true });
});

export default router;
