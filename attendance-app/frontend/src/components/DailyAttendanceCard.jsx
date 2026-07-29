import { useEffect, useState } from "react";
import { CalendarDays, CheckCircle2, XCircle } from "lucide-react";
import api from "../api";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function DailyAttendanceCard({ fetchUrl }) {
  const [date, setDate] = useState(todayStr());
  const [data, setData] = useState(null);

  useEffect(() => {
    setData(null);
    api.get(`${fetchUrl}?date=${date}`).then((res) => setData(res.data));
  }, [fetchUrl, date]);

  return (
    <div className="card p-5 mb-8">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h2 className="text-sm font-medium text-ink-soft uppercase tracking-wide flex items-center gap-1.5">
          <CalendarDays size={15} /> Daily attendance
        </h2>
        <input
          type="date"
          className="input py-1.5 text-sm w-auto"
          value={date}
          max={todayStr()}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>
      {!data ? (
        <div className="text-sm text-ink-soft">Loading…</div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-lg bg-verified-soft text-verified flex items-center justify-center shrink-0">
              <CheckCircle2 size={18} />
            </span>
            <div>
              <div className="font-display text-2xl font-semibold text-verified">{data.present}</div>
              <div className="text-xs text-ink-soft">Present</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-lg bg-alert-soft text-alert flex items-center justify-center shrink-0">
              <XCircle size={18} />
            </span>
            <div>
              <div className="font-display text-2xl font-semibold text-alert">{data.absent}</div>
              <div className="text-xs text-ink-soft">Absent</div>
            </div>
          </div>
        </div>
      )}
      <p className="text-xs text-ink-soft mt-3">
        Counts every attendance mark recorded on this date (dates shown in UTC).
      </p>
    </div>
  );
}
