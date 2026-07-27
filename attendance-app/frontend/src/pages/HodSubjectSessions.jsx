import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, FileBarChart2, Pencil } from "lucide-react";
import Layout from "../components/Layout";
import api from "../api";

export default function HodSubjectSessions() {
  const { id } = useParams();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get(`/hod/subjects/${id}/sessions`).then((res) => setData(res.data));
  }, [id]);

  if (!data) return <Layout><div className="text-ink-soft text-sm">Loading…</div></Layout>;

  const { subject, sessions } = data;

  return (
    <Layout>
      <Link to="/hod" className="text-sm text-ink-soft hover:text-ink flex items-center gap-1 w-fit">
        <ArrowLeft size={14} /> Back to department
      </Link>

      <div className="mt-3 mb-8 flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-xs font-mono uppercase tracking-widest text-ink-soft mb-1">
            Manage sessions
          </div>
          <h1 className="font-display text-3xl font-semibold">{subject.name}</h1>
        </div>
        <Link
          to={`/hod/subjects/${id}/report`}
          className="text-sm border border-line rounded-md px-3 py-1.5 hover:border-ink transition-colors flex items-center gap-1.5"
        >
          <FileBarChart2 size={14} /> View full report
        </Link>
      </div>

      {sessions.length === 0 ? (
        <div className="card p-6 text-sm text-ink-soft">
          No sessions have been held for this subject yet.
        </div>
      ) : (
        <div className="card divide-y divide-line">
          <div className="px-4 py-3 grid grid-cols-[1fr_auto_auto_auto] gap-4 text-xs font-medium text-ink-soft uppercase tracking-wide">
            <span>Session</span>
            <span>Present</span>
            <span>Absent</span>
            <span></span>
          </div>
          {sessions.map((s) => (
            <Link
              key={s.id}
              to={`/hod/sessions/${s.id}`}
              className="px-4 py-3 grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center text-sm hover:bg-paper transition-colors"
            >
              <div>
                <div className="font-medium">
                  {new Date(s.started_at + "Z").toLocaleString()}
                </div>
                {s.status === "active" && (
                  <div className="text-xs text-amber mt-0.5 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber live-pulse" /> Live now
                  </div>
                )}
              </div>
              <span className="font-mono text-verified text-right">{s.present_count}</span>
              <span className="font-mono text-alert text-right">{s.absent_count}</span>
              <span className="text-xs font-medium text-ink-soft text-right flex items-center gap-1 justify-end">
                <Pencil size={12} /> Edit
              </span>
            </Link>
          ))}
        </div>
      )}
    </Layout>
  );
}
