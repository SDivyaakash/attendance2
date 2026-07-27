import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Camera, ChevronRight, BookOpen } from "lucide-react";
import Layout from "../components/Layout";
import QrScanner from "../components/QrScanner";
import api, { apiErrorMessage } from "../api";
import { useAuth } from "../AuthContext";

export default function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState([]);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState("");

  async function load() {
    setLoading(true);
    const { data } = await api.get("/student/subjects");
    setSubjects(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleEnroll(e) {
    e.preventDefault();
    setError("");
    if (!code.trim()) return;
    try {
      await api.post("/student/enroll", { code: code.trim().toUpperCase() });
      setCode("");
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  function handleScanResult(decodedText, err) {
    setScanning(false);
    if (err) {
      setScanError(err);
      return;
    }
    try {
      const url = new URL(decodedText);
      const session = url.searchParams.get("session");
      const token = url.searchParams.get("token");
      if (!session || !token) throw new Error();
      navigate(`/attend?session=${session}&token=${token}`);
    } catch {
      setScanError("That QR code doesn't look like a RollCall attendance code.");
    }
  }

  return (
    <Layout>
      <div className="flex items-baseline justify-between mb-8 flex-wrap gap-3">
        <div>
          <div className="text-xs font-mono uppercase tracking-widest text-ink-soft mb-1">
            Student · {user.roll_no}
          </div>
          <h1 className="font-display text-3xl font-semibold">
            Hi, {user.name.split(" ")[0]}
          </h1>
        </div>
        <button
          onClick={() => {
            setScanError("");
            setScanning(true);
          }}
          className="bg-verified text-paper rounded-md px-5 py-2.5 text-sm font-medium hover:opacity-90 flex items-center gap-2"
        >
          <Camera size={16} /> Scan attendance QR
        </button>
      </div>

      {scanError && (
        <div className="text-sm text-alert bg-alert-soft rounded-md px-3 py-2 mb-6">
          {scanError}
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <h2 className="text-sm font-medium text-ink-soft mb-3 uppercase tracking-wide">
            Your subjects
          </h2>
          {loading ? (
            <div className="text-ink-soft text-sm">Loading…</div>
          ) : subjects.length === 0 ? (
            <div className="card p-6 text-ink-soft text-sm">
              Not enrolled anywhere yet — get a join code from your teacher.
            </div>
          ) : (
            <div className="space-y-3">
              {subjects.map((s) => (
                <Link
                  key={s.id}
                  to={`/student/subjects/${s.id}`}
                  className="card card-hover p-4 flex items-center justify-between block"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-lg bg-verified-soft text-verified flex items-center justify-center shrink-0">
                      <BookOpen size={16} />
                    </span>
                    <div>
                      <div className="font-medium">{s.name}</div>
                      <div className="text-xs text-ink-soft mt-0.5">{s.teacher_name}</div>
                    </div>
                  </div>
                  {s.active_session_id ? (
                    <span className="text-xs font-medium text-amber flex items-center gap-1.5 whitespace-nowrap">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber live-pulse" /> LIVE NOW
                    </span>
                  ) : (
                    <ChevronRight size={16} className="text-ink-soft shrink-0" />
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-sm font-medium text-ink-soft mb-3 uppercase tracking-wide">
            Join a subject
          </h2>
          <form onSubmit={handleEnroll} className="card p-4 space-y-3">
            <input
              className="input font-mono uppercase"
              placeholder="JOIN CODE"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            {error && <div className="text-sm text-alert">{error}</div>}
            <button className="w-full bg-ink text-paper rounded-md py-2 text-sm font-medium hover:opacity-90">
              Enroll
            </button>
          </form>
        </div>
      </div>

      {scanning && (
        <QrScanner onResult={handleScanResult} onClose={() => setScanning(false)} />
      )}
    </Layout>
  );
}
