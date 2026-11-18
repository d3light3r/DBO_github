"use client";

import { useActionState, useState } from "react";
import { addReceipt, closeShift, openShift, type StationState } from "./actions";
import { fmtLiters, fmtMoney, readingSales, round2, shiftTotals } from "@/lib/station-calc";

export type NozzleView = { id: string; name: string; fuelName: string; price: number; tankId: string };
export type TankView = { id: string; name: string; fuelName: string; book: number };

const parse = (v: string) => {
  const n = Number(v.replace(/[\s,]/g, ""));
  return v.trim() === "" || !Number.isFinite(n) ? null : n;
};

function Message({ state }: { state: StationState }) {
  if (!state) return null;
  return (
    <p className={`rounded-lg px-3 py-2 text-sm ${state.ok ? "bg-emerald-50 text-emerald-700" : "bg-brand-soft text-brand"}`}>{state.message}</p>
  );
}

function NumInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input inputMode="decimal" autoComplete="off" className="input text-right tabular-nums" {...props} />;
}

// ---------------- Ээлж нээх ----------------
export function OpenShiftForm({
  nozzles,
  lastEnd,
  handoverExpected,
}: {
  nozzles: NozzleView[];
  lastEnd: Record<string, number>;
  handoverExpected: number;
}) {
  const [state, action, pending] = useActionState(openShift, null);
  const [received, setReceived] = useState("");
  const r = parse(received);
  const handoverDiff = r == null ? null : round2(r - handoverExpected);

  return (
    <form action={action} className="card space-y-4">
      <h2 className="font-semibold">Ээлж нээх</h2>

      <div className="space-y-2">
        <p className="text-sm font-medium">1. Тоолуурын эхлэх заалт</p>
        {nozzles.map((n) => (
          <label key={n.id} className="grid grid-cols-[1fr_9rem] items-center gap-2 text-sm">
            <span>
              {n.name} <span className="text-xs text-gray-400">· {n.fuelName}</span>
              {lastEnd[n.id] != null && <span className="block text-[11px] text-gray-400">Өмнөх ээлж: {lastEnd[n.id]}</span>}
            </span>
            <NumInput name={`start_${n.id}`} defaultValue={lastEnd[n.id] ?? ""} required />
          </label>
        ))}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">2. Өмнөх ээлжээс хүлээн авсан бэлэн мөнгө</p>
        <p className="text-xs text-gray-500">Өмнөх ээлж шилжүүлсэн гэж бүртгэсэн: <b>{fmtMoney(handoverExpected)}</b>. Бодитоор тоолоод оруулна уу.</p>
        <NumInput name="handover_received" value={received} onChange={(e) => setReceived(e.target.value)} placeholder="0" required />
        {handoverDiff != null && handoverDiff !== 0 && (
          <p className="text-xs text-amber-700">Зөрүү: {fmtMoney(handoverDiff)} — ээлж нээсний дараа менежерт мэдэгдээрэй.</p>
        )}
      </div>

      <Message state={state} />
      <button className="btn-primary w-full py-3" disabled={pending}>{pending ? "Нээж байна..." : "Ээлж нээх"}</button>
    </form>
  );
}

// ---------------- Түлш хүлээн авах ----------------
export function ReceiptForm({ tanks }: { tanks: TankView[] }) {
  const [state, action, pending] = useActionState(addReceipt, null);
  return (
    <form action={action} className="space-y-2">
      <select name="tank_id" className="input" required defaultValue="">
        <option value="" disabled>Сав сонгох</option>
        {tanks.map((t) => (
          <option key={t.id} value={t.id}>{t.name} · {t.fuelName}</option>
        ))}
      </select>
      <div className="grid grid-cols-2 gap-2">
        <NumInput name="liters" placeholder="Литр" required />
        <input name="doc_no" className="input" placeholder="Падааны №" />
      </div>
      <input name="supplier" className="input" placeholder="Нийлүүлэгч" />
      <Message state={state} />
      <button className="btn-ghost w-full" disabled={pending}>{pending ? "Хадгалж байна..." : "Хүлээн авснаа бүртгэх"}</button>
    </form>
  );
}

// ---------------- Ээлж хаах ----------------
export function CloseShiftForm({
  nozzles,
  starts,
  tanks,
}: {
  nozzles: NozzleView[];
  starts: Record<string, number>;
  tanks: TankView[];
}) {
  const [state, action, pending] = useActionState(closeShift, null);
  const [ends, setEnds] = useState<Record<string, string>>({});
  const [pay, setPay] = useState({ pay_cash: "", pay_card: "", pay_coupon: "", pay_credit: "" });

  const rows = nozzles
    .filter((n) => starts[n.id] != null)
    .map((n) => {
      const end = parse(ends[n.id] ?? "");
      const start = starts[n.id];
      const bad = end != null && end < start;
      return { n, start, end, bad, sales: end != null && !bad ? readingSales({ start, end, price: n.price }) : null };
    });
  const totals = shiftTotals(
    rows.filter((r) => r.sales).map((r) => ({ start: r.start, end: r.end!, price: r.n.price })),
    {
      cash: parse(pay.pay_cash) ?? 0,
      card: parse(pay.pay_card) ?? 0,
      coupon: parse(pay.pay_coupon) ?? 0,
      credit: parse(pay.pay_credit) ?? 0,
    },
  );
  const allEntered = rows.every((r) => r.sales);
  // Энэ ээлжийн борлуулалтыг хассан дансны үлдэгдэл
  const soldByTank = new Map<string, number>();
  for (const r of rows) if (r.sales) soldByTank.set(r.n.tankId, (soldByTank.get(r.n.tankId) ?? 0) + r.sales.liters);

  return (
    <form action={action} className="card space-y-5">
      <h2 className="font-semibold">Ээлж хаах</h2>

      <div className="space-y-2">
        <p className="text-sm font-medium">1. Тоолуурын дуусах заалт</p>
        {rows.map(({ n, start, bad, sales }) => (
          <div key={n.id} className="space-y-1">
            <label className="grid grid-cols-[1fr_9rem] items-center gap-2 text-sm">
              <span>
                {n.name} <span className="text-xs text-gray-400">· {n.fuelName} · {fmtMoney(n.price)}/л</span>
                <span className="block text-[11px] text-gray-400">Эхлэх: {start}</span>
              </span>
              <NumInput
                name={`end_${n.id}`}
                value={ends[n.id] ?? ""}
                onChange={(e) => setEnds({ ...ends, [n.id]: e.target.value })}
                required
                className={`input text-right tabular-nums ${bad ? "border-brand" : ""}`}
              />
            </label>
            {bad && <p className="text-right text-xs text-brand">Эхлэх заалтаас бага байна</p>}
            {sales && <p className="text-right text-xs text-gray-500">{fmtLiters(sales.liters)} · {fmtMoney(sales.amount)}</p>}
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">2. Орлого</p>
        {(
          [
            ["pay_cash", "Бэлэн"],
            ["pay_card", "Карт"],
            ["pay_coupon", "Талон"],
            ["pay_credit", "Зээл"],
          ] as const
        ).map(([k, label]) => (
          <label key={k} className="grid grid-cols-[1fr_9rem] items-center gap-2 text-sm">
            <span>{label}</span>
            <NumInput name={k} value={pay[k]} onChange={(e) => setPay({ ...pay, [k]: e.target.value })} placeholder="0" />
          </label>
        ))}
      </div>

      <div className="rounded-xl bg-gray-50 p-3 text-sm">
        <div className="flex justify-between"><span className="text-gray-500">Тоолуураар борлуулалт</span><b className="tabular-nums">{fmtMoney(totals.amount)}</b></div>
        <div className="flex justify-between"><span className="text-gray-500">Нийт литр</span><span className="tabular-nums">{fmtLiters(totals.liters)}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">Нийт орлого</span><span className="tabular-nums">{fmtMoney(totals.paid)}</span></div>
        <div className="mt-1 flex justify-between border-t border-gray-200 pt-1">
          <span>{totals.difference < 0 ? "Дутагдал" : totals.difference > 0 ? "Илүүдэл" : "Зөрүү"}</span>
          <b className={`tabular-nums ${totals.difference < 0 ? "text-brand" : totals.difference > 0 ? "text-amber-600" : "text-emerald-600"}`}>
            {fmtMoney(Math.abs(totals.difference))}
          </b>
        </div>
        {!allEntered && <p className="mt-1 text-xs text-gray-400">Бүх заалтыг оруулсны дараа зөрүү зөв харагдана.</p>}
      </div>

      {tanks.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">3. Савны хэмжилт (бодит үлдэгдэл, литр)</p>
          {tanks.map((t) => (
            <label key={t.id} className="grid grid-cols-[1fr_9rem] items-center gap-2 text-sm">
              <span>
                {t.name} <span className="text-xs text-gray-400">· {t.fuelName}</span>
                <span className="block text-[11px] text-gray-400">Дансаар: {fmtLiters(t.book - (soldByTank.get(t.id) ?? 0))}</span>
              </span>
              <NumInput name={`tank_${t.id}`} required />
            </label>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <p className="text-sm font-medium">{tanks.length > 0 ? "4" : "3"}. Ээлж хүлээлцэх</p>
        <label className="grid grid-cols-[1fr_9rem] items-center gap-2 text-sm">
          <span>Дараагийн ээлжид үлдээх бэлэн мөнгө</span>
          <NumInput name="handover_cash" placeholder="0" required />
        </label>
        <textarea name="note" className="input" rows={2} placeholder="Тэмдэглэл (зөрүүний шалтгаан г.м.)" maxLength={1000} />
      </div>

      <Message state={state} />
      <button
        className="btn-primary w-full py-3"
        disabled={pending}
        onClick={(e) => {
          if (!confirm("Ээлжийг хаах уу? Хаасны дараа засах боломжгүй.")) e.preventDefault();
        }}
      >
        {pending ? "Хааж байна..." : "Ээлж хаах"}
      </button>
    </form>
  );
}
