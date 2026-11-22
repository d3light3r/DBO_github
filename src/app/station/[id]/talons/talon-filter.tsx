"use client";

import { useEffect, useState } from "react";
import { fmtMoney, FORM_PREFIXES, talonAmount } from "@/lib/talon";

type Props = { type: string; cq: string; serial: string; from: string; to: string; today: string; yesterday: string };

export function TalonFilter(p: Props) {
  const [from, setFrom] = useState(p.from);
  const [to, setTo] = useState(p.to);
  // Өнөөдөр / Өчигдөр сонголт нь огнооноос шууд гарна: өөр өдөр сонговол сонголт арилна
  const quick = from === to && (from === p.today || from === p.yesterday) ? from : "";

  // Сонгоход зөвхөн огноог тохируулна («Шүүх» дарж байж шүүнэ)
  const pick = (d: string) => {
    setFrom(d);
    setTo(d);
  };

  // Хаягаас шүүлтийг арилгана: хэрэглэгч хуудсаа refresh хийхэд өнөөдөр сонгогдож, талбарууд хоосорно
  useEffect(() => {
    if (window.location.search) window.history.replaceState(window.history.state, "", window.location.pathname);
  });

  return (
    <form className="space-y-2" autoComplete="off">
      <div className="flex gap-4 text-sm">
        {[
          { d: p.today, label: "Өнөөдөр" },
          { d: p.yesterday, label: "Өчигдөр" },
        ].map((o) => (
          <label key={o.d} className="flex cursor-pointer items-center gap-1.5">
            <input type="radio" checked={quick === o.d} onChange={() => pick(o.d)} />
            {o.label}
          </label>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <div>
          <label className="label">Төрөл</label>
          <select name="type" defaultValue={p.type} className="input">
            <option value="">Бүгд</option>
            {FORM_PREFIXES.map((x) => <option key={x} value={x}>{x} · {fmtMoney(talonAmount(x) ?? 0)}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Харилцагч (нэр / регистр)</label>
          <input name="cq" defaultValue={p.cq} className="input" placeholder="Хайх" />
        </div>
        <div>
          <label className="label">Сериал</label>
          <input name="serial" defaultValue={p.serial} className="input font-mono" placeholder="AB0001…" />
        </div>
        <div>
          <label className="label">Эхлэх огноо</label>
          <input type="date" name="from" value={from} onChange={(e) => setFrom(e.target.value)} max={p.today} className="input" required />
        </div>
        <div>
          <label className="label">Дуусах огноо</label>
          <input type="date" name="to" value={to} onChange={(e) => setTo(e.target.value)} max={p.today} className="input" required />
        </div>
        <div className="flex items-end">
          <button className="btn-primary w-full">Шүүх</button>
        </div>
      </div>
    </form>
  );
}
