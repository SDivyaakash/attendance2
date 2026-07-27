import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// On Render, mount a persistent Disk (e.g. at /data) and set DB_PATH to
// /data/attendance.db so the database survives deploys/restarts. Without
// this, SQLite writes to the app's local filesystem, which Render wipes
// on every deploy.
const dbPath = process.env.DB_PATH || path.join(__dirname, "..", "attendance.db");
const db = new Database(dbPath);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS departments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('student','teacher','hod','principal')),
  roll_no TEXT,
  department_id INTEGER REFERENCES departments(id),
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS subjects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  teacher_id INTEGER NOT NULL REFERENCES users(id),
  department_id INTEGER REFERENCES departments(id),
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS enrollments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subject_id INTEGER NOT NULL REFERENCES subjects(id),
  student_id INTEGER NOT NULL REFERENCES users(id),
  UNIQUE(subject_id, student_id)
);

CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subject_id INTEGER NOT NULL REFERENCES subjects(id),
  teacher_id INTEGER NOT NULL REFERENCES users(id),
  secret TEXT NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  radius_meters REAL NOT NULL DEFAULT 40,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','ended')),
  started_at TEXT DEFAULT (datetime('now')),
  ended_at TEXT
);

CREATE TABLE IF NOT EXISTS attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL REFERENCES sessions(id),
  student_id INTEGER NOT NULL REFERENCES users(id),
  status TEXT NOT NULL CHECK(status IN ('present','absent')),
  distance_meters REAL,
  gps_accuracy REAL,
  is_manual INTEGER DEFAULT 0,
  marked_by_user_id INTEGER REFERENCES users(id),
  marked_at TEXT DEFAULT (datetime('now')),
  UNIQUE(session_id, student_id)
);
`);

// Migration for databases created before gps_accuracy existed.
try {
  db.exec("ALTER TABLE attendance ADD COLUMN gps_accuracy REAL");
} catch {
  // Column already exists — nothing to do.
}

// Migration for HOD-editable attendance: tracks whether a record was set
// manually (rather than via QR scan) and who made the change.
try {
  db.exec("ALTER TABLE attendance ADD COLUMN is_manual INTEGER DEFAULT 0");
} catch {
  // Column already exists — nothing to do.
}
try {
  db.exec("ALTER TABLE attendance ADD COLUMN marked_by_user_id INTEGER REFERENCES users(id)");
} catch {
  // Column already exists — nothing to do.
}

// Migration for databases created before departments/HOD/Principal existed.
try {
  db.exec("ALTER TABLE subjects ADD COLUMN department_id INTEGER REFERENCES departments(id)");
} catch {
  // Column already exists — nothing to do.
}

// SQLite can't ALTER a CHECK constraint in place, so if this database still
// has the old users.role CHECK (only 'teacher'/'student'), rebuild the table
// with the expanded constraint and a department_id column, preserving data.
const usersTableDef = db
  .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'users'")
  .get();
if (usersTableDef && !usersTableDef.sql.includes("'hod'")) {
  db.exec(`
    ALTER TABLE users RENAME TO users_old;

    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('student','teacher','hod','principal')),
      roll_no TEXT,
      department_id INTEGER REFERENCES departments(id),
      created_at TEXT DEFAULT (datetime('now'))
    );

    INSERT INTO users (id, name, email, password_hash, role, roll_no, created_at)
      SELECT id, name, email, password_hash, role, roll_no, created_at FROM users_old;

    DROP TABLE users_old;
  `);
}

// Seed a default set of departments the first time this runs, so signup
// has something to select from out of the box. A principal can add more
// later from their dashboard.
const departmentCount = db.prepare("SELECT COUNT(*) as c FROM departments").get().c;
if (departmentCount === 0) {
  const defaults = [
    ["Computer Science & Engineering", "CSE"],
    ["Information Technology", "IT"],
    ["Electronics & Communication", "ECE"],
    ["Electrical & Electronics", "EEE"],
    ["Mechanical Engineering", "MECH"],
    ["Civil Engineering", "CIVIL"],
    ["Business Administration", "MBA"],
    ["Computer Applications", "MCA"],
  ];
  const insert = db.prepare("INSERT INTO departments (name, code) VALUES (?, ?)");
  for (const [name, code] of defaults) insert.run(name, code);
}

export default db;
