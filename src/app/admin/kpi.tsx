export function Kpi({ label, value, tone = "text-gray-900", hint }: { label: string; value: number | string; tone?: string; hint?: string }) {
  return (
    <div className="card">
      <p className={`text-2xl font-bold tabular-nums ${tone}`}>{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
      {hint && <p className="mt-0.5 text-[11px] text-gray-400">{hint}</p>}
    </div>
  );
}
