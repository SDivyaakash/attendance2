import { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle2, MapPin, AlertTriangle, LogIn, QrCode } from "lucide-react";
import Layout from "../components/Layout";
import api, { apiErrorMessage } from "../api";
import { useAuth } from "../AuthContext";

export default function AttendPage() {
  const [params] = useSearchParams();
  const { user } = useAuth();
  const sessionId = params.get("session");
  const token = params.get("token");

  const [status, setStatus] = useState("idle"); // idle | locating | submitting | success | error
  const [message, setMessage] = useState("");
  const [distance, setDistance] = useState(null);
  const [accuracy, setAccuracy] = useState(null);

  if (!user) {
    const pendingUrl = `/attend?session=${sessionId}&token=${token}`;
    localStorage.setItem("pendingAttendUrl", pendingUrl);
    return (
      <Layout>
        <div className="max-w-sm mx-auto text-center card p-8 mt-10">
          <div className="w-12 h-12 rounded-full bg-verified-soft text-verified flex items-center justify-center mx-auto mb-4">
            <LogIn size={22} />
          </div>
          <h1 className="font-display text-xl font-semibold mb-2">Log in to mark attendance</h1>
          <p className="text-sm text-ink-soft mb-5">
            You scanned a valid RollCall code — log in as a student to check in.
          </p>
          <Link to="/login" className="inline-block bg-verified text-paper rounded-md px-5 py-2.5 text-sm font-medium">
            Log in
          </Link>
        </div>
      </Layout>
    );
  }

  if (!sessionId || !token) {
    return (
      <Layout>
        <div className="max-w-sm mx-auto text-center card p-8 mt-10">
          <h1 className="font-display text-xl font-semibold mb-2">Nothing to scan</h1>
          <p className="text-sm text-ink-soft">This link is missing attendance details.</p>
        </div>
      </Layout>
    );
  }

  function markPresent() {
    setStatus("locating");
    setMessage("");
    if (!navigator.geolocation) {
      setStatus("error");
      setMessage("Your browser doesn't support location access, which is required.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setStatus("submitting");
        setAccuracy(Math.round(pos.coords.accuracy));
        try {
          const { data } = await api.post("/student/mark-attendance", {
            sessionId: Number(sessionId),
            token,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          });
          setDistance(data.distance);
          setStatus("success");
        } catch (err) {
          setStatus("error");
          setMessage(apiErrorMessage(err));
          setDistance(err?.response?.data?.distance ?? null);
        }
      },
      (err) => {
        setStatus("error");
        setMessage("Location access was blocked — enable it in your browser settings and try again.");
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  }

  return (
    <Layout>
      <div className="max-w-sm mx-auto mt-6">
        {status === "success" ? (
          <div className="card p-8 text-center border-verified/30 bg-verified-soft">
            <div className="w-14 h-14 rounded-full bg-verified text-paper flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={28} />
            </div>
            <h1 className="font-display text-2xl font-semibold text-verified mb-2">
              Marked present
            </h1>
            <p className="text-sm text-ink-soft">
              You were {distance}m from the classroom — verified and logged.
              {accuracy != null && (
                <span className="block mt-1 font-mono text-xs">
                  (device GPS accuracy: ±{accuracy}m)
                </span>
              )}
            </p>
            <Link to="/student" className="inline-block mt-6 text-sm underline text-ink-soft">
              Back to dashboard
            </Link>
          </div>
        ) : (
          <div className="card p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-paper border border-line flex items-center justify-center mx-auto mb-4">
              <QrCode size={20} className="text-ink-soft" />
            </div>
            <div className="text-xs font-mono uppercase tracking-widest text-ink-soft mb-2">
              Attendance check-in
            </div>
            <h1 className="font-display text-xl font-semibold mb-4">
              Confirm you're in class
            </h1>
            <p className="text-sm text-ink-soft mb-6 leading-relaxed">
              We'll check your device's location against the classroom before
              marking you present. Make sure location access is allowed.
            </p>

            {status === "error" && (
              <div className="text-sm text-alert bg-alert-soft rounded-md px-3 py-2 mb-4 text-left flex gap-2">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <div>
                  {message}
                  {distance != null && (
                    <div className="mt-1 font-mono text-xs">Detected distance: {distance}m</div>
                  )}
                  {accuracy != null && (
                    <div className="mt-1 font-mono text-xs flex items-center gap-1">
                      <MapPin size={12} /> Your device's GPS accuracy: ±{accuracy}m
                    </div>
                  )}
                  {accuracy != null && accuracy > 50 && (
                    <div className="mt-2 text-xs text-ink-soft">
                      That's a fairly wide margin of error — this is common indoors or on
                      laptops. Try enabling "Precise" / "High accuracy" location in your
                      device settings, or move closer to a window, then scan again.
                    </div>
                  )}
                </div>
              </div>
            )}

            <button
              onClick={markPresent}
              disabled={status === "locating" || status === "submitting"}
              className="w-full bg-verified text-paper rounded-md py-3 font-medium hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {status === "locating" ? (
                "Getting your location…"
              ) : status === "submitting" ? (
                "Verifying…"
              ) : (
                <>
                  <MapPin size={16} /> I'm here — mark me present
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}
