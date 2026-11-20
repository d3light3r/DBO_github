"use client";

import { useState } from "react";
import { fmtMoney, parseRange } from "@/lib/talon";

/** Эхний / сүүлийн сериал + шууд урьдчилан харах (тоо ширхэг, дүн) */
export function TalonRangeFields({ autoFocus = false }: { autoFocus?: boolean }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const r = from ? parseRange(from, to) : null;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label">Эхний сериал</label>
          <input name="from" className="input font-mono uppercase" value={from} onChange={(e) => setFrom(e.target.value)}
            placeholder="AB0001201" autoComplete="off" autoCapitalize="characters" autoFocus={autoFocus} required />
        </div>
        <div>
          <label className="label">Сүүлийн сериал (олноор бол)</label>
          <input name="to" className="input font-mono uppercase" value={to} onChange={(e) => setTo(e.target.value)}
            placeholder="AB0001250 эсвэл 1250" autoComplete="off" autoCapitalize="characters" />
        </div>
      </div>
      {r &&
        ("error" in r ? (
          <p className="text-xs text-brand">{r.error}</p>
        ) : (
          <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm">
            <b>{fmtMoney(r.amount)}</b> · {r.count} ширхэг
            {r.count > 1 && <span className="font-mono text-xs text-gray-500"> ({r.from} – {r.to})</span>} · нийт <b>{fmtMoney(r.total)}</b>
          </p>
        ))}
      <p className="text-xs text-gray-500">AA = 20 000₮ · AB = 50 000₮ · AC = 10 000₮. Ганц талон бол сүүлийн сериалыг хоосон орхино.</p>
    </div>
  );
}
