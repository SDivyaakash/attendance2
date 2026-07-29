import { useEffect, useState } from "react";
import { Search, Users } from "lucide-react";
import api from "../api";

export default function TeacherList({ fetchUrl, showDepartment }) {
  const [teachers, setTeachers] = useState(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    setTeachers(null);
    api.get(fetchUrl).then((res) => setTeachers(res.data));
  }, [fetchUrl]);

  const cols = showDepartment ? "grid-cols-[1fr_auto_auto_auto]" : "grid-cols-[1fr_auto_auto]";

  return (
    <div>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h2 className="text-sm font-medium text-ink-soft uppercase tracking-wide flex items-center gap-1.5">
          <Users size={14} /> Teachers {teachers && `(${teachers.length})`}
        </h2>
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-soft pointer-events-none" />
          <input
            className="input pl-8 py-1.5 text-sm w-60"
            placeholder="Search by name or email…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {!teachers ? (
        <div className="text-sm text-ink-soft">Loading…</div>
      ) : (
        (() => {
          const filtered = teachers.filter((t) =>
            `${t.name} ${t.email}`.toLowerCase().includes(query.toLowerCase())
          );
          if (filtered.length === 0) {
            return (
              <div className="card p-4 text-sm text-ink-soft">
                {query ? "No teachers match your search." : "No teachers yet."}
              </div>
            );
          }
          return (
            <div className="card divide-y divide-line">
              <div className={`px-4 py-3 grid ${cols} gap-4 text-xs font-medium text-ink-soft uppercase tracking-wide`}>
                <span>Name</span>
                {showDepartment && <span>Department</span>}
                <span>Subjects</span>
                <span>Sessions run</span>
              </div>
              {filtered.map((t) => (
                <div key={t.id} className={`px-4 py-3 grid ${cols} gap-4 items-center text-sm`}>
                  <div>
                    <div className="font-medium">{t.name}</div>
                    <div className="text-xs text-ink-soft">{t.email}</div>
                  </div>
                  {showDepartment && (
                    <span className="text-xs font-mono text-ink-soft">{t.department_code || "—"}</span>
                  )}
                  <span className="font-mono text-ink-soft text-right">{t.subject_count}</span>
                  <span className="font-mono text-ink-soft text-right">{t.sessions_count}</span>
                </div>
              ))}
            </div>
          );
        })()
      )}
    </div>
  );
}
