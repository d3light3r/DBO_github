"use client";

import { useState } from "react";
import { FORM_PREFIXES, fmtMoney, parseTalonRow, talonAmount } from "@/lib/talon";

type Row = { from: string; to: string; qty: string };
const empty: Row = { from: "", to: "", qty: "" };
const digits = (v: string) => v.replace(/\D/g, "").slice(0, 7);
/** "225" -> "0000225": 7 оронтой болтол урдаас нь 0-ээр нөхнө */
const pad7 = (v: string) => (v ? v.padStart(7, "0") : v);

/**
 * AA / AB / AC гэсэн 3 мөр. Мөр бүрт: эхний дугаар, сүүлийн дугаар, тоо ширхэг.
 * Тоо ширхэг бичвэл сүүлийн дугаар автоматаар бодогдоно, эсрэгээрээ ч мөн.
 */
export function TalonRangeFields({ autoFocus = false }: { autoFocus?: boolean }) {
  const [rows, setRows] = useState<Record<string, Row>>(() => Object.fromEntries(FORM_PREFIXES.map((p) => [p, empty])));

  function update(p: string, field: keyof Row, raw: string) {
    const v = digits(raw);
    const r = { ...rows[p], [field]: v };
    const start = r.from ? Number(r.from) : null;
    if (start != null) {
      if (field === "qty" || (field === "from" && r.qty)) {
        // Тоо ширхэгээс сүүлийн дугаар
        const q = Number(r.qty);
        r.to = r.qty && q >= 1 && start + q - 1 <= 9999999 ? pad7(String(start + q - 1)) : "";
      } else if (field === "to" || field === "from") {
        // Сүүлийн дугаараас тоо ширхэг
        const end = r.to ? Number(r.to) : null;
        r.qty = end != null && end >= start ? String(end - start + 1) : "";
      }
    }
    setRows({ ...rows, [p]: r });
  }

  // Талбараас гарахад (эсвэл Enter) дугаарыг 7 орон болгоно
  function pad(p: string, field: "from" | "to") {
    const v = rows[p][field];
    if (v && v.length < 7) setRows({ ...rows, [p]: { ...rows[p], [field]: pad7(v) } });
  }

  const parsed = FORM_PREFIXES.map((p) => ({ p, r: parseTalonRow(p, rows[p].from, rows[p].to, rows[p].qty) }));
  const ok = parsed.flatMap(({ r }) => (r && !("error" in r) ? [r] : []));
  const errors = parsed.flatMap(({ r }) => (r && "error" in r ? [r.error] : []));
  const total = ok.reduce((t, r) => t + r.total, 0);
  const count = ok.reduce((t, r) => t + r.count, 0);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[3rem_1fr_1fr_5.5rem] gap-2 text-xs font-medium text-gray-600">
        <span />
        <span>Эхний сериал</span>
        <span>Сүүлийн сериал</span>
        <span>Тоо ширхэг</span>
      </div>
      {FORM_PREFIXES.map((p, i) => (
        <div key={p} className="grid grid-cols-[3rem_1fr_1fr_5.5rem] items-center gap-2">
          <span className="flex h-full items-center justify-center rounded-lg border border-gray-300 bg-gray-50 text-sm font-semibold" title={fmtMoney(talonAmount(p) ?? 0)}>
            {p}
          </span>
          <input name={`from_${p}`} value={rows[p].from} onChange={(e) => update(p, "from", e.target.value)} onBlur={() => pad(p, "from")}
            className="input font-mono tabular-nums" inputMode="numeric" placeholder="0001201" autoComplete="off" autoFocus={autoFocus && i === 0} />
          <input name={`to_${p}`} value={rows[p].to} onChange={(e) => update(p, "to", e.target.value)} onBlur={() => pad(p, "to")}
            className="input font-mono tabular-nums" inputMode="numeric" placeholder="0001250" autoComplete="off" />
          <input name={`qty_${p}`} value={rows[p].qty} onChange={(e) => update(p, "qty", e.target.value)}
            className="input text-right tabular-nums" inputMode="numeric" placeholder="1" autoComplete="off" />
        </div>
      ))}
      {errors.map((e) => <p key={e} className="text-xs text-brand">{e}</p>)}
      {ok.length > 0 && (
        <div className="rounded-lg bg-gray-50 px-3 py-2 text-sm">
          {ok.map((r) => (
            <p key={r.prefix} className="flex justify-between gap-2">
              <span className="font-mono text-xs">{r.from}{r.count > 1 && ` – ${r.to}`}</span>
              <span className="tabular-nums">{fmtMoney(r.amount)} × {r.count}</span>
            </p>
          ))}
          <p className="mt-1 flex justify-between border-t border-gray-200 pt-1 font-semibold">
            <span>Нийт {count} ширхэг</span>
            <span className="tabular-nums">{fmtMoney(total)}</span>
          </p>
        </div>
      )}
      <p className="text-xs text-gray-500">AA = 20 000₮ · AB = 50 000₮ · AC = 10 000₮. Дугаарыг 225 гэж бичвэл 0000225 болж нөхөгдөнө. Ганц талон бол зөвхөн эхний сериалыг бичнэ. Тоо ширхэг бичвэл сүүлийн сериал өөрөө бодогдоно.</p>
    </div>
  );
}
