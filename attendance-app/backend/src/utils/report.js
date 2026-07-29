import db from "../db.js";

// Per-student present/total/percentage for a single subject, across all
// sessions that have been ended. Used by teacher, HOD, and principal report
// views alike — ownership/scope checks happen in the calling route.
export function computeSubjectReport(subjectId) {
  const subject = db
    .prepare(
      `SELECT s.*, u.name as teacher_name, d.name as department_name
       FROM subjects s
       JOIN users u ON u.id = s.teacher_id
       LEFT JOIN departments d ON d.id = s.department_id
       WHERE s.id = ?`
    )
    .get(subjectId);
  if (!subject) return null;

  const totalSessions = db
    .prepare("SELECT COUNT(*) as c FROM sessions WHERE subject_id = ? AND status = 'ended'")
    .get(subjectId).c;

  const students = db
    .prepare(
      `SELECT u.id, u.name, u.roll_no,
        (SELECT COUNT(*) FROM attendance a
          JOIN sessions se ON se.id = a.session_id
          WHERE se.subject_id = ? AND a.student_id = u.id AND a.status = 'present') as present_count
       FROM enrollments e JOIN users u ON u.id = e.student_id
       WHERE e.subject_id = ? ORDER BY u.roll_no`
    )
    .all(subjectId, subjectId);

  const rows = students.map((s) => ({
    ...s,
    total_sessions: totalSessions,
    percentage: totalSessions ? Math.round((s.present_count / totalSessions) * 1000) / 10 : null,
  }));

  return { subject, totalSessions, rows };
}

export function reportToCsv(report) {
  const escapeCsv = (val) => `"${String(val).replace(/"/g, '""')}"`;
  const lines = [
    ["Roll No", "Name", "Present", "Total Sessions", "Percentage"].map(escapeCsv).join(","),
  ];
  for (const r of report.rows) {
    lines.push(
      [r.roll_no, r.name, r.present_count, r.total_sessions, r.percentage ?? ""]
        .map(escapeCsv)
        .join(",")
    );
  }
  return lines.join("\n");
}

export function csvFilename(name) {
  return `${name.replace(/[^a-z0-9]+/gi, "_")}_attendance_report.csv`;
}

// Aggregate stats for every subject within a department — used by both the
// HOD (their own department) and the principal (any department).
export function computeDepartmentOverview(departmentId) {
  const department = db.prepare("SELECT * FROM departments WHERE id = ?").get(departmentId);
  if (!department) return null;

  const teacherCount = db
    .prepare("SELECT COUNT(*) as c FROM users WHERE role = 'teacher' AND department_id = ?")
    .get(departmentId).c;

  const studentCount = db
    .prepare("SELECT COUNT(*) as c FROM users WHERE role = 'student' AND department_id = ?")
    .get(departmentId).c;

  const subjects = db
    .prepare(
      `SELECT s.id, s.name, s.code, u.name as teacher_name,
        (SELECT COUNT(*) FROM sessions se WHERE se.subject_id = s.id AND se.status = 'ended') as total_sessions,
        (SELECT COUNT(*) FROM enrollments en WHERE en.subject_id = s.id) as student_count,
        (SELECT COUNT(*) FROM attendance a JOIN sessions se ON se.id = a.session_id
           WHERE se.subject_id = s.id AND a.status = 'present') as present_total,
        (SELECT COUNT(*) FROM attendance a JOIN sessions se ON se.id = a.session_id
           WHERE se.subject_id = s.id) as marked_total
       FROM subjects s JOIN users u ON u.id = s.teacher_id
       WHERE s.department_id = ? ORDER BY s.name`
    )
    .all(departmentId)
    .map((s) => ({
      ...s,
      attendance_percentage: s.marked_total ? Math.round((s.present_total / s.marked_total) * 1000) / 10 : null,
    }));

  const totalPresent = subjects.reduce((sum, s) => sum + s.present_total, 0);
  const totalMarked = subjects.reduce((sum, s) => sum + s.marked_total, 0);
  const overallPercentage = totalMarked ? Math.round((totalPresent / totalMarked) * 1000) / 10 : null;

  return { department, teacherCount, studentCount, subjects, overallPercentage };
}

// Teacher directory for a department — how many subjects they run and how
// many sessions they've held in total. Used by both HOD and principal views.
export function getDepartmentTeachers(departmentId) {
  return db
    .prepare(
      `SELECT u.id, u.name, u.email,
        (SELECT COUNT(*) FROM subjects s WHERE s.teacher_id = u.id AND s.department_id = ?) as subject_count,
        (SELECT COUNT(*) FROM sessions se JOIN subjects s ON s.id = se.subject_id
           WHERE s.teacher_id = u.id AND s.department_id = ? AND se.status = 'ended') as sessions_count
       FROM users u WHERE u.role = 'teacher' AND u.department_id = ? ORDER BY u.name`
    )
    .all(departmentId, departmentId, departmentId);
}

// Student directory for a department — each student's overall attendance
// percentage across every subject taught within that department.
export function getDepartmentStudents(departmentId) {
  const students = db
    .prepare(
      `SELECT id, name, roll_no, email FROM users
       WHERE role = 'student' AND department_id = ? ORDER BY roll_no`
    )
    .all(departmentId);

  return students.map((stu) => {
    const totals = db
      .prepare(
        `SELECT
          (SELECT COUNT(*) FROM sessions se JOIN subjects s ON s.id = se.subject_id
             JOIN enrollments e ON e.subject_id = s.id AND e.student_id = ?
             WHERE s.department_id = ? AND se.status = 'ended') as total_sessions,
          (SELECT COUNT(*) FROM attendance a JOIN sessions se ON se.id = a.session_id
             JOIN subjects s ON s.id = se.subject_id
             WHERE a.student_id = ? AND a.status = 'present' AND s.department_id = ?) as present_count`
      )
      .get(stu.id, departmentId, stu.id, departmentId);

    return {
      ...stu,
      total_sessions: totals.total_sessions,
      present_count: totals.present_count,
      percentage: totals.total_sessions
        ? Math.round((totals.present_count / totals.total_sessions) * 1000) / 10
        : null,
    };
  });
}

// How many attendance records were marked present/absent on a given day
// (UTC date, matching how timestamps are stored). Pass departmentId = null
// for a college-wide total (principal); pass a specific id to scope to one
// department (HOD, or principal drilling into a department).
export function getDailySummary(departmentId, dateStr) {
  const deptFilter = departmentId ? "AND s.department_id = ?" : "";
  const baseParams = departmentId ? [dateStr, departmentId] : [dateStr];

  const present = db
    .prepare(
      `SELECT COUNT(*) as c FROM attendance a
       JOIN sessions se ON se.id = a.session_id
       JOIN subjects s ON s.id = se.subject_id
       WHERE date(a.marked_at) = ? AND a.status = 'present' ${deptFilter}`
    )
    .get(...baseParams).c;

  const absent = db
    .prepare(
      `SELECT COUNT(*) as c FROM attendance a
       JOIN sessions se ON se.id = a.session_id
       JOIN subjects s ON s.id = se.subject_id
       WHERE date(a.marked_at) = ? AND a.status = 'absent' ${deptFilter}`
    )
    .get(...baseParams).c;

  return { date: dateStr, present, absent };
}
