import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Users, GraduationCap, BookOpen, TrendingUp, ChevronRight } from "lucide-react";
import Layout from "../components/Layout";
import StatCard from "../components/StatCard";
import DailyAttendanceCard from "../components/DailyAttendanceCard";
import TeacherList from "../components/TeacherList";
import StudentList from "../components/StudentList";
import api from "../api";

export default function PrincipalDepartment() {
  const { id } = useParams();
  const [overview, setOverview] = useState(null);

  useEffect(() => {
    setOverview(null);
    api.get(`/principal/departments/${id}`).then((res) => setOverview(res.data));
  }, [id]);

  if (!overview) return <Layout><div className="text-ink-soft text-sm">Loading…</div></Layout>;

  const { department, teacherCount, studentCount, subjects, overallPercentage } = overview;

  return (
    <Layout>
      <Link to="/principal" className="text-sm text-ink-soft hover:text-ink flex items-center gap-1 w-fit">
        <ArrowLeft size={14} /> All departments
      </Link>

      <div className="mt-3 mb-8">
        <div className="text-xs font-mono uppercase tracking-widest text-ink-soft mb-1">
          Department · {department.code}
        </div>
        <h1 className="font-display text-3xl font-semibold">{department.name}</h1>
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

      <DailyAttendanceCard fetchUrl={`/principal/departments/${id}/daily-summary`} />

      <h2 className="text-sm font-medium text-ink-soft mb-3 uppercase tracking-wide">
        Subjects in {department.name}
      </h2>
      {subjects.length === 0 ? (
        <div className="card p-6 text-sm text-ink-soft">
          No subjects have been created in this department yet.
        </div>
      ) : (
        <div className="card divide-y divide-line">
          <div className="px-4 py-3 grid grid-cols-[1fr_auto_auto_auto] gap-4 text-xs font-medium text-ink-soft uppercase tracking-wide">
            <span>Subject</span>
            <span>Students</span>
            <span>Sessions</span>
            <span>Attendance</span>
          </div>
          {subjects.map((s) => {
            const low = s.attendance_percentage != null && s.attendance_percentage < 75;
            return (
              <Link
                key={s.id}
                to={`/principal/departments/${id}/subjects/${s.id}/report`}
                className="px-4 py-3 grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center text-sm hover:bg-paper transition-colors"
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
                  className={`font-mono font-semibold text-right w-16 flex items-center justify-end gap-1 ${
                    low ? "text-alert" : "text-verified"
                  }`}
                >
                  {s.attendance_percentage != null ? `${s.attendance_percentage}%` : "—"}
                  <ChevronRight size={13} className="text-ink-soft" />
                </span>
              </Link>
            );
          })}
        </div>
      )}

      <div className="mt-10">
        <TeacherList fetchUrl={`/principal/departments/${id}/teachers`} />
      </div>
      <StudentList fetchUrl={`/principal/departments/${id}/students`} />
    </Layout>
  );
}
