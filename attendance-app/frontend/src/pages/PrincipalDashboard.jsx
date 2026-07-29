import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Building2, Users, GraduationCap, BookOpen, TrendingUp, Plus } from "lucide-react";
import Layout from "../components/Layout";
import StatCard from "../components/StatCard";
import DailyAttendanceCard from "../components/DailyAttendanceCard";
import TeacherList from "../components/TeacherList";
import StudentList from "../components/StudentList";
import api, { apiErrorMessage } from "../api";
import { useAuth } from "../AuthContext";

export default function PrincipalDashboard() {
  const { user } = useAuth();
  const [overview, setOverview] = useState(null);
  const [showAddDept, setShowAddDept] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function load() {
    api.get("/principal/overview").then((res) => setOverview(res.data));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAddDepartment(e) {
    e.preventDefault();
    setError("");
    if (!name.trim() || !code.trim()) return;
    setSaving(true);
    try {
      await api.post("/principal/departments", { name: name.trim(), code: code.trim() });
      setName("");
      setCode("");
      setShowAddDept(false);
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (!overview) return <Layout><div className="text-ink-soft text-sm">Loading…</div></Layout>;

  const { departments, collegePercentage } = overview;
  const totalTeachers = departments.reduce((sum, d) => sum + d.teacher_count, 0);
  const totalStudents = departments.reduce((sum, d) => sum + d.student_count, 0);
  const totalSubjects = departments.reduce((sum, d) => sum + d.subject_count, 0);

  return (
    <Layout>
      <div className="mb-8">
        <div className="text-xs font-mono uppercase tracking-widest text-ink-soft mb-1">
          Principal · College-wide
        </div>
        <h1 className="font-display text-3xl font-semibold">Welcome back, {user.name.split(" ")[0]}</h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
        <StatCard label="Departments" value={departments.length} icon={Building2} />
        <StatCard label="Teachers" value={totalTeachers} icon={Users} />
        <StatCard label="Students" value={totalStudents} icon={GraduationCap} />
        <StatCard label="Subjects" value={totalSubjects} icon={BookOpen} />
        <StatCard
          label="College attendance"
          value={collegePercentage != null ? `${collegePercentage}%` : "—"}
          icon={TrendingUp}
          accent
        />
      </div>

      <DailyAttendanceCard fetchUrl="/principal/daily-summary" />

      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-sm font-medium text-ink-soft uppercase tracking-wide">
          Departments
        </h2>
        <button
          onClick={() => setShowAddDept((v) => !v)}
          className="text-sm border border-line rounded-md px-3 py-1.5 hover:border-ink transition-colors flex items-center gap-1.5"
        >
          {showAddDept ? "Cancel" : <><Plus size={14} /> Add department</>}
        </button>
      </div>

      {showAddDept && (
        <form onSubmit={handleAddDepartment} className="card p-4 mb-6 flex flex-wrap gap-3 items-end">
          <label className="block flex-1 min-w-[200px]">
            <span className="block text-sm font-medium text-ink-soft mb-1.5">Department name</span>
            <input
              className="input"
              placeholder="e.g. Chemical Engineering"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="block w-32">
            <span className="block text-sm font-medium text-ink-soft mb-1.5">Code</span>
            <input
              className="input font-mono uppercase"
              placeholder="CHEM"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </label>
          <button
            disabled={saving}
            className="bg-verified text-paper rounded-md px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-60"
          >
            {saving ? "Adding…" : "Add"}
          </button>
          {error && <div className="text-sm text-alert w-full">{error}</div>}
        </form>
      )}

      <div className="card divide-y divide-line">
        <div className="px-4 py-3 grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 text-xs font-medium text-ink-soft uppercase tracking-wide">
          <span>Department</span>
          <span>Teachers</span>
          <span>Students</span>
          <span>Subjects</span>
          <span>Attendance</span>
        </div>
        {departments.map((d) => {
          const low = d.attendance_percentage != null && d.attendance_percentage < 75;
          return (
            <Link
              key={d.id}
              to={`/principal/departments/${d.id}`}
              className="px-4 py-3 grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 items-center text-sm hover:bg-paper transition-colors"
            >
              <div>
                <div className="font-medium">{d.name}</div>
                <div className="text-xs font-mono text-ink-soft">{d.code}</div>
              </div>
              <span className="font-mono text-ink-soft text-right">{d.teacher_count}</span>
              <span className="font-mono text-ink-soft text-right">{d.student_count}</span>
              <span className="font-mono text-ink-soft text-right">{d.subject_count}</span>
              <span
                className={`font-mono font-semibold text-right w-16 ${
                  low ? "text-alert" : "text-verified"
                }`}
              >
                {d.attendance_percentage != null ? `${d.attendance_percentage}%` : "—"}
              </span>
            </Link>
          );
        })}
      </div>

      <div className="mt-10">
        <TeacherList fetchUrl="/principal/teachers" showDepartment />
      </div>
      <StudentList fetchUrl="/principal/students" showDepartment />
    </Layout>
  );
}
