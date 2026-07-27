export default function StatCard({ label, value, accent, icon: Icon }) {
  return (
    <div className="card p-5 relative overflow-hidden">
      <div className="flex items-start justify-between mb-3">
        <div className="text-xs font-medium text-ink-soft uppercase tracking-wide">
          {label}
        </div>
        {Icon && (
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              accent ? "bg-verified-soft text-verified" : "bg-paper text-ink-soft"
            }`}
          >
            <Icon size={16} strokeWidth={2} />
          </div>
        )}
      </div>
      <div className={`font-display text-3xl font-semibold ${accent ? "text-verified" : ""}`}>
        {value}
      </div>
    </div>
  );
}
