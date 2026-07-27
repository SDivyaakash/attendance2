import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Layout from "../components/Layout";
import api from "../api";

export default function TeacherSessionReport() {
  const { id } = useParams();
  const [report, setReport] = useState(null);

  useEffect(() => {
    api.get(`/teacher/sessions/${id}/report`).then(({ data }) => setReport(data));
  }, [id]);

  if (!report) return <Layout><div className="text-ink-soft text-sm">Loading…</div></Layout>;

  const present = report.rows.filter((r) => r.status === "present");
  const absent = report.rows.filter((r) => r.status === "absent");

  return (
    <Layout>
      <Link to={`/teacher/subjects/${report.session.subject_id}`} className="text-sm text-ink-soft hover:text-ink flex items-center gap-1 w-fit">
        <ArrowLeft size={14} /> Back to subject
      </Link>

      <div className="mt-3 mb-8">
        <div className="text-xs font-mono uppercase tracking-widest text-ink-soft mb-1">
          Session report
        </div>
        <h1 className="font-display text-3xl font-semibold">
          {new Date(report.session.started_at + "Z").toLocaleString()}
        </h1>
        <div className="text-sm text-ink-soft font-mono mt-1">
          <span className="text-verified">{present.length} present</span> ·{" "}
          <span className="text-alert">{absent.length} absent</span>
        </div>
        {report.session.radius_meters === 0 && (
          <div className="text-xs text-amber mt-1">Location check was disabled for this session</div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <h2 className="text-sm font-medium text-verified mb-3 uppercase tracking-wide">
            Present ({present.length})
          </h2>
          <div className="card divide-y divide-line">
            {present.length === 0 && <div className="px-4 py-3 text-sm text-ink-soft">Nobody scanned in.</div>}
            {present.map((r, i) => (
              <div key={i} className="px-4 py-3 flex items-center justify-between text-sm">
                <div>
                  <div className="font-medium">{r.name}</div>
                  <div className="text-xs font-mono text-ink-soft">{r.roll_no}</div>
                </div>
                <div className="text-xs text-ink-soft font-mono text-right">
                  <div>{new Date(r.marked_at + "Z").toLocaleTimeString()}</div>
                  {r.gps_accuracy != null && <div>±{Math.round(r.gps_accuracy)}m accuracy</div>}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-medium text-alert mb-3 uppercase tracking-wide">
            Absent ({absent.length})
          </h2>
          <div className="card divide-y divide-line">
            {absent.length === 0 && <div className="px-4 py-3 text-sm text-ink-soft">Everyone showed up.</div>}
            {absent.map((r, i) => (
              <div key={i} className="px-4 py-3 flex items-center justify-between text-sm">
                <div>
                  <div className="font-medium">{r.name}</div>
                  <div className="text-xs font-mono text-ink-soft">{r.roll_no}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
