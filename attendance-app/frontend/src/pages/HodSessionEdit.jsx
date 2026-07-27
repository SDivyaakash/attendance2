import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Check, X, PencilLine } from "lucide-react";
import Layout from "../components/Layout";
import api from "../api";

export default function HodSessionEdit() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [savingId, setSavingId] = useState(null);

  function load() {
    api.get(`/hod/sessions/${id}/roster`).then((res) => setData(res.data));
  }

  useEffect(() => {
    load();
  }, [id]);

  async function setStatus(studentId, status) {
    setSavingId(studentId);
    try {
      await api.post(`/hod/sessions/${id}/attendance`, { student_id: studentId, status });
      load();
    } finally {
      setSavingId(null);
    }
  }

  if (!data) return <Layout><div className="text-ink-soft text-sm">Loading…</div></Layout>;

  const { session, subject, roster } = data;

  return (
    <Layout>
      <Link to={`/hod/subjects/${subject.id}/sessions`} className="text-sm text-ink-soft hover:text-ink flex items-center gap-1 w-fit">
        <ArrowLeft size={14} /> Back to sessions
      </Link>

      <div className="mt-3 mb-8">
        <div className="text-xs font-mono uppercase tracking-widest text-ink-soft mb-1">
          Editing attendance · {subject.name}
        </div>
        <h1 className="font-display text-2xl font-semibold">
          {new Date(session.started_at + "Z").toLocaleString()}
        </h1>
        <p className="text-sm text-ink-soft mt-1">
          Corrections here are logged as manual edits and marked with your name.
        </p>
      </div>

      <div className="card divide-y divide-line">
        <div className="px-4 py-3 grid grid-cols-[1fr_auto] gap-4 text-xs font-medium text-ink-soft uppercase tracking-wide">
          <span>Student</span>
          <span>Status</span>
        </div>
        {roster.map((r) => (
          <div key={r.student_id} className="px-4 py-3 grid grid-cols-[1fr_auto] gap-4 items-center text-sm">
            <div>
              <div className="font-medium">{r.name}</div>
              <div className="text-xs font-mono text-ink-soft">{r.roll_no}</div>
              {r.is_manual === 1 && r.marked_by_name && (
                <div className="text-xs text-amber mt-0.5 flex items-center gap-1">
                  <PencilLine size={11} /> Manually set by {r.marked_by_name}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setStatus(r.student_id, "present")}
                disabled={savingId === r.student_id}
                className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors disabled:opacity-50 flex items-center gap-1 ${
                  r.status === "present"
                    ? "bg-verified text-paper border-verified"
                    : "border-line text-ink-soft hover:border-verified hover:text-verified"
                }`}
              >
                <Check size={13} /> Present
              </button>
              <button
                onClick={() => setStatus(r.student_id, "absent")}
                disabled={savingId === r.student_id}
                className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors disabled:opacity-50 flex items-center gap-1 ${
                  r.status === "absent"
                    ? "bg-alert text-paper border-alert"
                    : "border-line text-ink-soft hover:border-alert hover:text-alert"
                }`}
              >
                <X size={13} /> Absent
              </button>
              {!r.status && (
                <span className="text-xs text-ink-soft italic ml-1">not marked</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </Layout>
  );
}
