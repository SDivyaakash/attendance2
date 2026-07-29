import { useEffect, useState } from "react";
import { Search, GraduationCap } from "lucide-react";
import api from "../api";

export default function StudentList({ fetchUrl, showDepartment }) {
  const [students, setStudents] = useState(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    setStudents(null);
    api.get(fetchUrl).then((res) => setStudents(res.data));
  }, [fetchUrl]);

  const cols = showDepartment ? "grid-cols-[1fr_auto_auto]" : "grid-cols-[1fr_auto]";

  return (
    <div className="mt-10">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h2 className="text-sm font-medium text-ink-soft uppercase tracking-wide flex items-center gap-1.5">
          <GraduationCap size={14} /> Students {students && `(${students.length})`}
        </h2>
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-soft pointer-events-none" />
          <input
            className="input pl-8 py-1.5 text-sm w-60"
            placeholder="Search by name or roll no…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {!students ? (
        <div className="text-sm text-ink-soft">Loading…</div>
      ) : (
        (() => {
          const filtered = students.filter((s) =>
            `${s.name} ${s.roll_no}`.toLowerCase().includes(query.toLowerCase())
          );
          if (filtered.length === 0) {
            return (
              <div className="card p-4 text-sm text-ink-soft">
                {query ? "No students match your search." : "No students yet."}
              </div>
            );
          }
          return (
            <div className="card divide-y divide-line">
              <div className={`px-4 py-3 grid ${cols} gap-4 text-xs font-medium text-ink-soft uppercase tracking-wide`}>
                <span>Student</span>
                {showDepartment && <span>Department</span>}
                <span>Attendance</span>
              </div>
              {filtered.map((s) => {
                const low = s.percentage != null && s.percentage < 75;
                return (
                  <div key={s.id} className={`px-4 py-3 grid ${cols} gap-4 items-center text-sm`}>
                    <div>
                      <div className="font-medium">{s.name}</div>
                      <div className="text-xs font-mono text-ink-soft">{s.roll_no}</div>
                    </div>
                    {showDepartment && (
                      <span className="text-xs font-mono text-ink-soft">{s.department_code || "—"}</span>
                    )}
                    <span
                      className={`font-mono font-semibold text-right w-16 ${
                        low ? "text-alert" : "text-verified"
                      }`}
                    >
                      {s.percentage != null ? `${s.percentage}%` : "—"}
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })()
      )}
    </div>
  );
}
