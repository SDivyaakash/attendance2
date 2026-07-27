import { Link, useNavigate } from "react-router-dom";
import { GraduationCap, LogOut } from "lucide-react";
import { useAuth } from "../AuthContext";

const ROLE_STYLES = {
  student: "bg-verified-soft text-verified",
  teacher: "bg-verified-soft text-verified",
  hod: "bg-amber-soft text-amber",
  principal: "bg-ink text-paper",
};

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-line bg-panel">
        <div className="max-w-5xl mx-auto px-5 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <span className="w-9 h-9 rounded-lg bg-ink flex items-center justify-center relative">
              <GraduationCap size={18} className="text-paper" strokeWidth={2} />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber live-pulse" />
            </span>
            <span className="font-display text-xl font-semibold tracking-tight">RollCall</span>
          </Link>

          {user && (
            <div className="flex items-center gap-4">
              <div className="text-right leading-tight hidden sm:flex flex-col items-end gap-1">
                <div className="text-sm font-medium">{user.name}</div>
                <span
                  className={`text-[10px] font-mono uppercase tracking-wide px-1.5 py-0.5 rounded ${
                    ROLE_STYLES[user.role] || "bg-paper text-ink-soft"
                  }`}
                >
                  {user.role}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="text-sm px-3 py-1.5 rounded-md border border-line hover:border-ink transition-colors flex items-center gap-1.5"
              >
                <LogOut size={14} /> <span className="hidden sm:inline">Log out</span>
              </button>
            </div>
          )}
        </div>
      </header>
      <main className="flex-1 max-w-5xl w-full mx-auto px-5 py-8">{children}</main>
    </div>
  );
}
