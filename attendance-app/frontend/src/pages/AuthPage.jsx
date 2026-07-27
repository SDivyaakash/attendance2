import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GraduationCap, User, ShieldCheck, Building2, ChevronRight } from "lucide-react";
import api, { apiErrorMessage } from "../api";
import { useAuth } from "../AuthContext";

const ROLE_LABELS = { student: "Student", teacher: "Teacher", hod: "HOD", principal: "Principal" };
const ROLE_ICONS = { student: GraduationCap, teacher: User, hod: ShieldCheck, principal: Building2 };
const ROLES_REQUIRING_DEPARTMENT = ["student", "teacher", "hod"];
const DASHBOARD_BY_ROLE = {
  student: "/student",
  teacher: "/teacher",
  hod: "/hod",
  principal: "/principal",
};

export default function AuthPage() {
  const [mode, setMode] = useState("login"); // 'login' | 'signup'
  const [role, setRole] = useState("student");
  const [departments, setDepartments] = useState([]);
  const [form, setForm] = useState({ name: "", email: "", password: "", roll_no: "", department_id: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/auth/departments").then((res) => setDepartments(res.data)).catch(() => {});
  }, []);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const path = mode === "login" ? "/auth/login" : "/auth/signup";
      const payload =
        mode === "login"
          ? { email: form.email, password: form.password }
          : {
              ...form,
              role,
              department_id: ROLES_REQUIRING_DEPARTMENT.includes(role)
                ? Number(form.department_id) || null
                : null,
            };
      const { data } = await api.post(path, payload);
      login(data.token, data.user);
      const pendingAttendUrl = localStorage.getItem("pendingAttendUrl");
      if (pendingAttendUrl && data.user.role === "student") {
        localStorage.removeItem("pendingAttendUrl");
        navigate(pendingAttendUrl);
      } else {
        navigate(DASHBOARD_BY_ROLE[data.user.role] || "/login");
      }
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <div className="hidden md:flex flex-col justify-between bg-ink text-paper p-10 relative overflow-hidden">
        <div className="absolute inset-0 dot-grid pointer-events-none" />

        <div className="flex items-center gap-2.5 relative">
          <span className="w-9 h-9 rounded-lg bg-paper/10 flex items-center justify-center relative">
            <GraduationCap size={18} strokeWidth={2} />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber live-pulse" />
          </span>
          <span className="font-display text-xl font-semibold">RollCall</span>
        </div>

        <div className="relative">
          <h1 className="font-display text-4xl leading-tight mb-4">
            Present means<br />present in the room.
          </h1>
          <p className="text-paper/70 max-w-sm leading-relaxed mb-8">
            Each class runs a QR code that rotates every few seconds and checks
            the scanner's location against the classroom. No proxy attendance,
            no shared screenshots — just a register that verifies itself.
          </p>

          <div className="space-y-2 max-w-xs">
            {[
              { icon: GraduationCap, label: "Student", sub: "scans in each class" },
              { icon: User, label: "Teacher", sub: "runs sessions, sees live results" },
              { icon: ShieldCheck, label: "HOD", sub: "oversees their department" },
              { icon: Building2, label: "Principal", sub: "oversees the whole college" },
            ].map(({ icon: Icon, label, sub }, i) => (
              <div key={label} className="flex items-center gap-3 text-sm">
                <span className="w-7 h-7 rounded-md bg-paper/10 flex items-center justify-center shrink-0">
                  <Icon size={14} />
                </span>
                <span className="font-medium">{label}</span>
                <span className="text-paper/50 text-xs">{sub}</span>
                {i < 3 && <ChevronRight size={12} className="text-paper/30 ml-auto shrink-0" />}
              </div>
            ))}
          </div>
        </div>

        <div className="text-xs text-paper/40 font-mono relative">Built for college classrooms</div>
      </div>

      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="flex gap-1 mb-8 border border-line rounded-lg p-1 bg-panel">
            <button
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                mode === "login" ? "bg-ink text-paper" : "text-ink-soft"
              }`}
              onClick={() => setMode("login")}
            >
              Log in
            </button>
            <button
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                mode === "signup" ? "bg-ink text-paper" : "text-ink-soft"
              }`}
              onClick={() => setMode("signup")}
            >
              Sign up
            </button>
          </div>

          <h2 className="font-display text-2xl font-semibold mb-6">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h2>

          {mode === "signup" && (
            <div className="grid grid-cols-2 gap-2 mb-5">
              {Object.keys(ROLE_LABELS).map((r) => {
                const Icon = ROLE_ICONS[r];
                const active = role === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                      active
                        ? "bg-verified text-paper border-verified"
                        : "border-line text-ink-soft hover:border-verified hover:text-verified"
                    }`}
                  >
                    <Icon size={16} strokeWidth={2} />
                    {ROLE_LABELS[r]}
                  </button>
                );
              })}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <Field label="Full name">
                <input
                  required
                  value={form.name}
                  onChange={update("name")}
                  className="input"
                  placeholder="Asha Rao"
                />
              </Field>
            )}
            {mode === "signup" && role === "student" && (
              <Field label="Roll number">
                <input
                  required
                  value={form.roll_no}
                  onChange={update("roll_no")}
                  className="input font-mono"
                  placeholder="CS2024031"
                />
              </Field>
            )}
            {mode === "signup" && ROLES_REQUIRING_DEPARTMENT.includes(role) && (
              <Field label="Department">
                <select
                  required
                  value={form.department_id}
                  onChange={update("department_id")}
                  className="input"
                >
                  <option value="" disabled>
                    Select a department…
                  </option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </Field>
            )}
            {mode === "signup" && role === "principal" && (
              <div className="text-xs text-ink-soft bg-paper border border-line rounded-md px-3 py-2.5 leading-relaxed flex gap-2 items-start">
                <Building2 size={15} className="shrink-0 mt-0.5 text-ink-soft" />
                <span>
                  Principal accounts oversee every department college-wide, so no
                  single department needs to be selected.
                </span>
              </div>
            )}
            <Field label="Email">
              <input
                required
                type="email"
                value={form.email}
                onChange={update("email")}
                className="input"
                placeholder="you@college.edu"
              />
            </Field>
            <Field label="Password">
              <input
                required
                type="password"
                minLength={6}
                value={form.password}
                onChange={update("password")}
                className="input"
                placeholder="••••••••"
              />
            </Field>

            {error && (
              <div className="text-sm text-alert bg-alert-soft rounded-md px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-verified text-paper rounded-md py-2.5 font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {loading ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-ink-soft mb-1.5">{label}</span>
      {children}
    </label>
  );
}
