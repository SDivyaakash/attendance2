import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeft, XCircle, CheckCircle2 } from "lucide-react";
import Layout from "../components/Layout";
import api from "../api";

const RING_SIZE = 260;
const RING_STROKE = 6;
const RADIUS = (RING_SIZE - RING_STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function TeacherLiveSession() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [qr, setQr] = useState(null);
  const [live, setLive] = useState(null);
  const [ending, setEnding] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(null);
  const tickRef = useRef(null);

  async function fetchQr() {
    try {
      const { data } = await api.get(`/teacher/sessions/${id}/qr`);
      setQr(data);
      setSecondsLeft(data.secondsUntilNextRotation);
    } catch {
      // session likely ended elsewhere
    }
  }

  async function fetchLive() {
    const { data } = await api.get(`/teacher/sessions/${id}/live`);
    setLive(data);
  }

  useEffect(() => {
    fetchQr();
    fetchLive();
    const qrInterval = setInterval(fetchQr, 4000);
    const liveInterval = setInterval(fetchLive, 3000);
    return () => {
      clearInterval(qrInterval);
      clearInterval(liveInterval);
    };
  }, [id]);

  useEffect(() => {
    clearInterval(tickRef.current);
    tickRef.current = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(tickRef.current);
  }, [qr]);

  async function handleEnd() {
    setEnding(true);
    await api.post(`/teacher/sessions/${id}/end`);
    navigate(`/teacher/sessions/${id}/report`);
  }

  if (!qr) {
    return (
      <Layout>
        <div className="text-ink-soft text-sm">Loading session…</div>
      </Layout>
    );
  }

  const rotateSeconds = qr.rotateSeconds || 12;
  const progress = secondsLeft != null ? secondsLeft / rotateSeconds : 1;
  const dashOffset = CIRCUMFERENCE * (1 - progress);
  const qrValue = `${window.location.origin}/attend?session=${qr.sessionId}&token=${qr.token}`;

  return (
    <Layout>
      <Link to={`/teacher/subjects/${live?.session.subject_id}`} className="text-sm text-ink-soft hover:text-ink flex items-center gap-1 w-fit">
        <ArrowLeft size={14} /> Back
      </Link>

      <div className="grid md:grid-cols-2 gap-10 mt-6 items-start">
        <div className="flex flex-col items-center">
          <div className="text-xs font-mono uppercase tracking-widest text-ink-soft mb-4 text-center">
            Refreshes every {rotateSeconds}s · project this for the class
            {live?.session.radius_meters === 0 && (
              <div className="text-amber mt-1">Location check disabled for this session</div>
            )}
          </div>
          <div className="relative" style={{ width: RING_SIZE, height: RING_SIZE }}>
            <svg width={RING_SIZE} height={RING_SIZE} className="absolute inset-0 -rotate-90">
              <circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RADIUS}
                fill="none"
                stroke="var(--color-line)"
                strokeWidth={RING_STROKE}
              />
              <circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RADIUS}
                fill="none"
                stroke="var(--color-amber)"
                strokeWidth={RING_STROKE}
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                style={{ transition: "stroke-dashoffset 1s linear" }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center p-8">
              <div className="bg-panel p-3 rounded-lg border border-line">
                <QRCodeSVG value={qrValue} size={RING_SIZE - 90} />
              </div>
            </div>
          </div>
          <div className="mt-4 text-sm text-ink-soft">
            Next code in <span className="font-mono text-ink font-medium">{secondsLeft}s</span>
          </div>

          <button
            onClick={handleEnd}
            disabled={ending}
            className="mt-8 bg-alert text-paper rounded-md px-5 py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-60 flex items-center gap-2"
          >
            <XCircle size={15} /> {ending ? "Ending…" : "End session & mark remaining absent"}
          </button>
        </div>

        <div>
          <h2 className="text-sm font-medium text-ink-soft mb-3 uppercase tracking-wide">
            Marked present · {live?.presentCount ?? 0} / {live?.totalEnrolled ?? 0}
          </h2>
          {!live || live.present.length === 0 ? (
            <div className="card p-4 text-sm text-ink-soft">
              No one has scanned in yet — display the QR above in class.
            </div>
          ) : (
            <div className="card divide-y divide-line max-h-[420px] overflow-y-auto">
              {live.present.map((p, i) => (
                <div key={i} className="px-4 py-3 flex items-center justify-between text-sm">
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs font-mono text-ink-soft">{p.roll_no}</div>
                  </div>
                  <div className="text-right text-xs text-ink-soft">
                    <div className="text-verified font-medium flex items-center gap-1 justify-end">
                      <CheckCircle2 size={12} /> present
                    </div>
                    <div>{Math.round(p.distance_meters)}m away</div>
                    {p.gps_accuracy != null && (
                      <div>±{Math.round(p.gps_accuracy)}m accuracy</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
