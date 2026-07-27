import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, ChevronRight, Plus } from "lucide-react";
import Layout from "../components/Layout";
import api, { apiErrorMessage } from "../api";
import { useAuth } from "../AuthContext";

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState([]);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data } = await api.get("/teacher/subjects");
    setSubjects(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    if (!name.trim()) return;
    try {
      await api.post("/teacher/subjects", { name });
      setName("");
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  return (
    <Layout>
      <div className="flex items-baseline justify-between mb-8">
        <div>
          <div className="text-xs font-mono uppercase tracking-widest text-ink-soft mb-1">
            Teacher
          </div>
          <h1 className="font-display text-3xl font-semibold">Good to see you, {user.name.split(" ")[0]}</h1>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <h2 className="text-sm font-medium text-ink-soft mb-3 uppercase tracking-wide">
            Your subjects
          </h2>
          {loading ? (
            <div className="text-ink-soft text-sm">Loading…</div>
          ) : subjects.length === 0 ? (
            <div className="card p-6 text-ink-soft text-sm">
              No subjects yet — create your first one to start taking roll call.
            </div>
          ) : (
            <div className="space-y-3">
              {subjects.map((s) => (
                <Link
                  key={s.id}
                  to={`/teacher/subjects/${s.id}`}
                  className="card card-hover p-4 flex items-center justify-between block"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-lg bg-verified-soft text-verified flex items-center justify-center shrink-0">
                      <BookOpen size={16} />
                    </span>
                    <div>
                      <div className="font-medium">{s.name}</div>
                      <div className="text-xs text-ink-soft font-mono mt-0.5">
                        CODE {s.code} · {s.student_count} enrolled
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-ink-soft shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-sm font-medium text-ink-soft mb-3 uppercase tracking-wide">
            New subject
          </h2>
          <form onSubmit={handleCreate} className="card p-4 space-y-3">
            <input
              className="input"
              placeholder="e.g. Data Structures"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            {error && <div className="text-sm text-alert">{error}</div>}
            <button className="w-full bg-ink text-paper rounded-md py-2 text-sm font-medium hover:opacity-90 flex items-center justify-center gap-1.5">
              <Plus size={15} /> Create subject
            </button>
            <p className="text-xs text-ink-soft leading-relaxed">
              You'll get a join code to share with students — they enter it once to enroll.
            </p>
          </form>
        </div>
      </div>
    </Layout>
  );
}
