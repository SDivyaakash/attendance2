import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "../db.js";
import { JWT_SECRET } from "../middleware/auth.js";

const router = Router();

const VALID_ROLES = ["student", "teacher", "hod", "principal"];
// Principals oversee the whole college, so they aren't tied to one department.
const ROLES_REQUIRING_DEPARTMENT = ["student", "teacher", "hod"];

function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      name: user.name,
      role: user.role,
      email: user.email,
      department_id: user.department_id,
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function toPublicUser(user) {
  const department = user.department_id
    ? db.prepare("SELECT id, name, code FROM departments WHERE id = ?").get(user.department_id)
    : null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    roll_no: user.roll_no,
    department,
  };
}

// Public — used to populate the department dropdown on signup.
router.get("/departments", (req, res) => {
  const departments = db.prepare("SELECT id, name, code FROM departments ORDER BY name").all();
  res.json(departments);
});

router.post("/signup", (req, res) => {
  const { name, email, password, role, roll_no, department_id } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: "name, email, password, role are required" });
  }
  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ error: "Invalid role" });
  }
  if (role === "student" && !roll_no) {
    return res.status(400).json({ error: "roll_no is required for students" });
  }
  if (ROLES_REQUIRING_DEPARTMENT.includes(role)) {
    if (!department_id) {
      return res.status(400).json({ error: "Please select a department" });
    }
    const dept = db.prepare("SELECT id FROM departments WHERE id = ?").get(department_id);
    if (!dept) return res.status(400).json({ error: "Selected department doesn't exist" });
  }

  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) return res.status(409).json({ error: "Email already registered" });

  const password_hash = bcrypt.hashSync(password, 10);
  const deptId = ROLES_REQUIRING_DEPARTMENT.includes(role) ? department_id : null;
  const info = db
    .prepare(
      "INSERT INTO users (name, email, password_hash, role, roll_no, department_id) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .run(name, email, password_hash, role, roll_no || null, deptId);

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(info.lastInsertRowid);
  const token = signToken(user);
  res.json({ token, user: toPublicUser(user) });
});

router.post("/login", (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: "Invalid email or password" });
  }
  const token = signToken(user);
  res.json({ token, user: toPublicUser(user) });
});

export default router;
