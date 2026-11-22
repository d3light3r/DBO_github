"use client";

import { useState } from "react";

export type Slice = { key: string; label: string; value: number; color: string };

/** Ирцийн төлөвийн donut: хэсэг бүрийн хооронд 2px зай, хулгана аваачихад тайлбар, хажууд нь шошго + тоо */
export function Donut({ slices, centerLabel }: { slices: Slice[]; centerLabel: string }) {
  const [hover, setHover] = useState<string | null>(null);
  const total = slices.reduce((a, s) => a + s.value, 0);
  const r = 62;
  const C = 2 * Math.PI * r;
  const gap = slices.filter((s) => s.value > 0).length > 1 ? 3 : 0;
  let offset = 0;
  const active = slices.find((s) => s.key === hover);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <svg viewBox="0 0 160 160" className="h-36 w-36 -rotate-90" role="img" aria-label={slices.map((s) => `${s.label} ${s.value}`).join(", ")}>
          <circle cx="80" cy="80" r={r} fill="none" stroke="#f3f4f6" strokeWidth="18" />
          {total > 0 &&
            slices.map((s) => {
              if (s.value === 0) return null;
              const len = (s.value / total) * C;
              const el = (
                <circle
                  key={s.key}
                  cx="80"
                  cy="80"
                  r={r}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={hover === s.key ? 22 : 18}
                  strokeDasharray={`${Math.max(len - gap, 0.5)} ${C}`}
                  strokeDashoffset={-offset}
                  className="cursor-pointer transition-[stroke-width]"
                  onMouseEnter={() => setHover(s.key)}
                  onMouseLeave={() => setHover(null)}
                >
                  <title>{`${s.label}: ${s.value} (${Math.round((s.value / total) * 100)}%)`}</title>
                </circle>
              );
              offset += len;
              return el;
            })}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold tabular-nums text-gray-900">{active ? active.value : total}</span>
          <span className="text-xs text-gray-500">{active ? active.label : centerLabel}</span>
        </div>
      </div>
      <ul className="grid w-full grid-cols-2 gap-1 text-xs">
        {slices.map((s) => (
          <li
            key={s.key}
            className={`flex items-center gap-1.5 rounded-lg px-2 py-1 ${hover === s.key ? "bg-gray-100" : ""}`}
            onMouseEnter={() => setHover(s.key)}
            onMouseLeave={() => setHover(null)}
          >
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: s.color }} />
            <span className="flex-1 truncate text-gray-600">{s.label}</span>
            <span className="font-semibold tabular-nums text-gray-900">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
