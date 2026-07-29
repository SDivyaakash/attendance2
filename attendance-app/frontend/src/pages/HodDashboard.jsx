import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Users, GraduationCap, BookOpen, TrendingUp, SlidersHorizontal, FileBarChart2 } from "lucide-react";
import Layout from "../components/Layout";
import StatCard from "../components/StatCard";
import DailyAttendanceCard from "../components/DailyAttendanceCard";
import TeacherList from "../components/TeacherList";
import StudentList from "../components/StudentList";
import api from "../api";
import { useAuth } from "../AuthContext";

export default function HodDashboard() {
  const { user } = useAuth();
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/hod/overview")
      .then((res) => setOverview(res.data))
      .catch((err) => setError(err?.response?.data?.error || "Couldn't load your department"));
  }, []);

  if (error) {
    return (
      <Layout>
        <div className="card p-6 text-sm text-alert bg-alert-soft">{error}</div>
      </Layout>
    );
  }

  if (!overview) return <Layout><div className="text-ink-soft text-sm">Loading…</div></Layout>;

  const { department, teacherCount, studentCount, subjects, overallPercentage } = overview;

  return (
    <Layout>
      <div className="mb-8">
        <div className="text-xs font-mono uppercase tracking-widest text-ink-soft mb-1">
          HOD · {department.code}
        </div>
        <h1 className="font-display text-3xl font-semibold">{department.name}</h1>
        <p className="text-sm text-ink-soft mt-1">Welcome back, {user.name.split(" ")[0]}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <StatCard label="Teachers" value={teacherCount} icon={Users} />
        <StatCard label="Students" value={studentCount} icon={GraduationCap} />
        <StatCard label="Subjects" value={subjects.length} icon={BookOpen} />
        <StatCard
          label="Overall attendance"
          value={overallPercentage != null ? `${overallPercentage}%` : "—"}
          icon={TrendingUp}
          accent
        />
      </div>

      <DailyAttendanceCard fetchUrl="/hod/daily-summary" />

      <h2 className="text-sm font-medium text-ink-soft mb-3 uppercase tracking-wide">
        Subjects in {department.name}
      </h2>
      {subjects.length === 0 ? (
        <div className="card p-6 text-sm text-ink-soft">
          No subjects have been created in your department yet — once teachers in{" "}
          {department.name} create subjects and run sessions, they'll show up here.
        </div>
      ) : (
        <div className="card divide-y divide-line">
          <div className="px-4 py-3 grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 text-xs font-medium text-ink-soft uppercase tracking-wide">
            <span>Subject</span>
            <span>Students</span>
            <span>Sessions</span>
            <span>Attendance</span>
            <span></span>
          </div>
          {subjects.map((s) => {
            const low = s.attendance_percentage != null && s.attendance_percentage < 75;
            return (
              <div
                key={s.id}
                className="px-4 py-3 grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 items-center text-sm hover:bg-paper transition-colors"
              >
                <div>
                  <div className="font-medium">{s.name}</div>
                  <div className="text-xs text-ink-soft mt-0.5">
                    {s.teacher_name} · <span className="font-mono">{s.code}</span>
                  </div>
                </div>
                <span className="font-mono text-ink-soft text-right">{s.student_count}</span>
                <span className="font-mono text-ink-soft text-right">{s.total_sessions}</span>
                <span
                  className={`font-mono font-semibold text-right w-16 ${
                    low ? "text-alert" : "text-verified"
                  }`}
                >
                  {s.attendance_percentage != null ? `${s.attendance_percentage}%` : "—"}
                </span>
                <div className="flex items-center gap-3 justify-end">
                  <Link
                    to={`/hod/subjects/${s.id}/sessions`}
                    className="text-xs font-medium text-ink-soft hover:text-ink whitespace-nowrap flex items-center gap-1"
                  >
                    <SlidersHorizontal size={13} /> Manage
                  </Link>
                  <Link
                    to={`/hod/subjects/${s.id}/report`}
                    className="text-xs font-medium text-verified hover:opacity-80 whitespace-nowrap flex items-center gap-1"
                  >
                    <FileBarChart2 size={13} /> Report
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-10">
        <TeacherList fetchUrl="/hod/teachers" />
      </div>
      <StudentList fetchUrl="/hod/students" />
    </Layout>
  );
}
