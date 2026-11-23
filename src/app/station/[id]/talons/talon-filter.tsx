"use client";

import { useEffect, useState, type ReactNode } from "react";
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
    setToTouched(false);
  };
  // Эхлэх огноо сонгоход дуусах огноог (гараар сонгоогүй бол) тэр сарын сүүлийн өдөр болгоно
  const [toTouched, setToTouched] = useState(false);
  const changeFrom = (d: string) => {
    setFrom(d);
    if (!toTouched && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
      const [y, m] = d.split("-").map(Number);
      const end = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
      setTo(end > p.today ? p.today : end);
    }
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
          <input type="date" name="from" value={from} onChange={(e) => changeFrom(e.target.value)} max={p.today} className="input" required />
        </div>
        <div>
          <label className="label">Дуусах огноо</label>
          <input type="date" name="to" value={to} onChange={(e) => {
              setTo(e.target.value);
              setToTouched(true);
            }} max={p.today} className="input" required />
        </div>
        <div className="flex items-end">
          <button className="btn-primary w-full">Шүүх</button>
        </div>
      </div>
    </form>
  );
}

/**
 * Харилцагчаар / Талоноор: аль нэг жагсаалтыг харуулна (хуудас ачаалахгүй).
 * JS-гүй, CSS (:has + :checked)-ээр солино — хуудас бүрэн ачаалахаас өмнө дарсан ч зөв ажиллана.
 */
export function ViewSwitch({ initial, customers, talons }: { initial: "customer" | "talon"; customers: ReactNode; talons: ReactNode }) {
  return (
    <div className="space-y-4 [&:has(input[value=customer]:checked)_.view-talon]:hidden [&:has(input[value=talon]:checked)_.view-customer]:hidden">
      <div className="flex gap-4 px-1 text-sm">
        {[
          { v: "customer" as const, label: "Харилцагчаар" },
          { v: "talon" as const, label: "Талоноор" },
        ].map((o) => (
          <label key={o.v} className="flex cursor-pointer items-center gap-1.5">
            <input type="radio" name="view" value={o.v} defaultChecked={initial === o.v} />
            {o.label}
          </label>
        ))}
      </div>
      <div className="view-customer">{customers}</div>
      <div className="view-talon">{talons}</div>
    </div>
  );
}
