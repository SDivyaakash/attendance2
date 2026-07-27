import { Router } from "express";
import db from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { computeSubjectReport, reportToCsv, csvFilename, computeDepartmentOverview } from "../utils/report.js";

const router = Router();
router.use(requireAuth, requireRole("principal"));

// College-wide summary: every department with its aggregate attendance %.
router.get("/overview", (req, res) => {
  const departments = db.prepare("SELECT * FROM departments ORDER BY name").all();

  const rows = departments.map((dept) => {
    const stats = db
      .prepare(
        `SELECT
          (SELECT COUNT(*) FROM users WHERE role = 'teacher' AND department_id = ?) as teacher_count,
          (SELECT COUNT(*) FROM users WHERE role = 'student' AND department_id = ?) as student_count,
          (SELECT COUNT(*) FROM subjects WHERE department_id = ?) as subject_count,
          (SELECT COUNT(*) FROM attendance a JOIN sessions se ON se.id = a.session_id
             JOIN subjects su ON su.id = se.subject_id
             WHERE su.department_id = ? AND a.status = 'present') as present_total,
          (SELECT COUNT(*) FROM attendance a JOIN sessions se ON se.id = a.session_id
             JOIN subjects su ON su.id = se.subject_id
             WHERE su.department_id = ?) as marked_total`
      )
      .get(dept.id, dept.id, dept.id, dept.id, dept.id);

    return {
      ...dept,
      ...stats,
      attendance_percentage: stats.marked_total
        ? Math.round((stats.present_total / stats.marked_total) * 1000) / 10
        : null,
    };
  });

  const collegePresent = rows.reduce((sum, r) => sum + r.present_total, 0);
  const collegeMarked = rows.reduce((sum, r) => sum + r.marked_total, 0);
  const collegePercentage = collegeMarked ? Math.round((collegePresent / collegeMarked) * 1000) / 10 : null;

  res.json({ departments: rows, collegePercentage });
});

router.get("/departments/:id", (req, res) => {
  const overview = computeDepartmentOverview(req.params.id);
  if (!overview) return res.status(404).json({ error: "Department not found" });
  res.json(overview);
});

router.get("/departments/:deptId/subjects/:subjectId/attendance-report", (req, res) => {
  const subject = db
    .prepare("SELECT * FROM subjects WHERE id = ? AND department_id = ?")
    .get(req.params.subjectId, req.params.deptId);
  if (!subject) return res.status(404).json({ error: "Subject not found in that department" });

  res.json(computeSubjectReport(subject.id));
});

router.get("/departments/:deptId/subjects/:subjectId/attendance-report.csv", (req, res) => {
  const subject = db
    .prepare("SELECT * FROM subjects WHERE id = ? AND department_id = ?")
    .get(req.params.subjectId, req.params.deptId);
  if (!subject) return res.status(404).json({ error: "Subject not found in that department" });

  const report = computeSubjectReport(subject.id);
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="${csvFilename(subject.name)}"`);
  res.send(reportToCsv(report));
});

// Principals can add new departments as the college grows.
router.post("/departments", (req, res) => {
  const { name, code } = req.body;
  if (!name || !code) return res.status(400).json({ error: "name and code are required" });

  const existing = db
    .prepare("SELECT id FROM departments WHERE name = ? OR code = ?")
    .get(name, code.toUpperCase());
  if (existing) return res.status(409).json({ error: "A department with that name or code already exists" });

  const info = db
    .prepare("INSERT INTO departments (name, code) VALUES (?, ?)")
    .run(name, code.toUpperCase());
  res.json(db.prepare("SELECT * FROM departments WHERE id = ?").get(info.lastInsertRowid));
});

export default router;
