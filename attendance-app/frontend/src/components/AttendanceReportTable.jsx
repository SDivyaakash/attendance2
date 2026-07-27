import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Download, ArrowLeft } from "lucide-react";
import api from "../api";

export default function AttendanceReportTable({ reportUrl, csvUrl, backTo, backLabel }) {
  const [report, setReport] = useState(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    setReport(null);
    api.get(reportUrl).then((res) => setReport(res.data));
  }, [reportUrl]);

  async function handleDownload() {
    setDownloading(true);
    try {
      const res = await api.get(csvUrl, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = `${report.subject.name.replace(/[^a-z0-9]+/gi, "_")}_attendance_report.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }

  if (!report) return <div className="text-ink-soft text-sm">Loading…</div>;

  const { subject, totalSessions, rows } = report;

  return (
    <div>
      <Link to={backTo} className="text-sm text-ink-soft hover:text-ink flex items-center gap-1 w-fit">
        <ArrowLeft size={14} /> {backLabel}
      </Link>

      <div className="mt-3 mb-8 flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-xs font-mono uppercase tracking-widest text-ink-soft mb-1">
            Attendance report
          </div>
          <h1 className="font-display text-3xl font-semibold">{subject.name}</h1>
          <div className="text-sm text-ink-soft mt-1">
            {subject.teacher_name && <>Taught by {subject.teacher_name} · </>}
            {totalSessions} session{totalSessions === 1 ? "" : "s"} held so far
          </div>
        </div>
        <button
          onClick={handleDownload}
          disabled={downloading || rows.length === 0}
          className="bg-ink text-paper rounded-md px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-60 flex items-center gap-2"
        >
          <Download size={15} /> {downloading ? "Preparing…" : "Download CSV"}
        </button>
      </div>

      {totalSessions === 0 ? (
        <div className="card p-6 text-sm text-ink-soft">
          No sessions have been held yet — attendance percentages will appear here
          once at least one class session runs and ends.
        </div>
      ) : rows.length === 0 ? (
        <div className="card p-6 text-sm text-ink-soft">No students enrolled yet.</div>
      ) : (
        <div className="card divide-y divide-line">
          <div className="px-4 py-3 grid grid-cols-[1fr_auto_auto] gap-4 text-xs font-medium text-ink-soft uppercase tracking-wide">
            <span>Student</span>
            <span>Present</span>
            <span>Attendance</span>
          </div>
          {rows.map((r) => {
            const low = r.percentage != null && r.percentage < 75;
            return (
              <div
                key={r.id}
                className="px-4 py-3 grid grid-cols-[1fr_auto_auto] gap-4 items-center text-sm"
              >
                <div>
                  <div className="font-medium">{r.name}</div>
                  <div className="text-xs font-mono text-ink-soft">{r.roll_no}</div>
                </div>
                <div className="font-mono text-ink-soft text-right">
                  {r.present_count}/{r.total_sessions}
                </div>
                <div
                  className={`font-mono font-semibold text-right w-16 ${
                    low ? "text-alert" : "text-verified"
                  }`}
                >
                  {r.percentage}%
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
