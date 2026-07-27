import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import Layout from "../components/Layout";
import api from "../api";

export default function StudentSubject() {
  const { id } = useParams();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get(`/student/subjects/${id}/attendance`).then((res) => setData(res.data));
  }, [id]);

  if (!data) return <Layout><div className="text-ink-soft text-sm">Loading…</div></Layout>;

  const { subject, rows, present, total, percentage } = data;
  const low = percentage != null && percentage < 75;

  return (
    <Layout>
      <Link to="/student" className="text-sm text-ink-soft hover:text-ink flex items-center gap-1 w-fit">
        <ArrowLeft size={14} /> All subjects
      </Link>

      <div className="mt-3 mb-8">
        <h1 className="font-display text-3xl font-semibold">{subject.name}</h1>
      </div>

      <div className="card p-6 mb-8 flex items-center gap-8 flex-wrap">
        <div>
          <div className="text-xs uppercase tracking-widest text-ink-soft mb-1">Attendance</div>
          <div className={`font-display text-4xl font-semibold ${low ? "text-alert" : "text-verified"}`}>
            {percentage != null ? `${percentage}%` : "—"}
          </div>
        </div>
        <div className="text-sm text-ink-soft font-mono">
          {present} present out of {total} session{total === 1 ? "" : "s"}
        </div>
        {low && (
          <div className="text-sm text-alert bg-alert-soft rounded-md px-3 py-2 flex items-center gap-2">
            <AlertTriangle size={14} /> Below 75% — check your college's attendance policy.
          </div>
        )}
      </div>

      <h2 className="text-sm font-medium text-ink-soft mb-3 uppercase tracking-wide">
        Session history
      </h2>
      {rows.length === 0 ? (
        <div className="card p-4 text-sm text-ink-soft">No sessions have run for this subject yet.</div>
      ) : (
        <div className="card divide-y divide-line">
          {rows.map((r, i) => (
            <div key={i} className="px-4 py-3 flex items-center justify-between text-sm">
              <span className="text-ink-soft">{new Date(r.started_at + "Z").toLocaleString()}</span>
              <span
                className={`font-mono font-medium flex items-center gap-1.5 ${
                  r.status === "present" ? "text-verified" : "text-alert"
                }`}
              >
                {r.status === "present" ? (
                  <><CheckCircle2 size={14} /> present</>
                ) : (
                  <><XCircle size={14} /> absent</>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
