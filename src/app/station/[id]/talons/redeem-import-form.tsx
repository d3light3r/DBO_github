"use client";

import { useActionState, useMemo, useState } from "react";
import { importRedeemTalons, type RedeemState } from "./actions";
import { FormMessage } from "@/components/form-message";
import { fmtMoney } from "@/lib/talon";
import { parseRedeemPaste } from "@/lib/talon-redeem-import";

export function RedeemImportForm({ stationId, stationName, today }: { stationId: string; stationName: string; today: string }) {
  const [text, setText] = useState("");
  const [state, action, pending] = useActionState(async (prev: RedeemState, f: FormData) => {
    const res = await importRedeemTalons(prev, f);
    if (res?.ok) setText("");
    return res;
  }, null);
  const parsed = useMemo(() => (text.trim() ? parseRedeemPaste(text) : null), [text]);
  const rows = parsed?.rows ?? [];
  const byType = new Map<number, number>();
  rows.forEach((r) => byType.set(r.amount, (byType.get(r.amount) ?? 0) + 1));
  const total = rows.reduce((t, r) => t + r.amount, 0);
  const blocked = !parsed || rows.length === 0 || parsed.errors.length > 0 || parsed.duplicates.length > 0;

  return (
    <form action={action} className="card space-y-3 ring-amber-300">
      <input type="hidden" name="station_id" value={stationId} />
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-semibold">📥 Excel-ээс импортлох</h2>
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">түр нээлттэй</span>
      </div>
      <p className="text-xs text-gray-500">
        <b>{stationName}</b>-д ашигласан талон. Мөр бүр: <b>Огноо · AB · 1234567</b> (жнь 2026.05.08 · AB · 671) эсвэл <b>Огноо · AB1234567</b>.
        Тоо 7-оос цөөн оронтой бол урдаас нь 0-ээр нөхнө. Огнооны хязгааргүй (зарсан огнооноос өмнөх, ирээдүйн огноо болохгүй).
      </p>
      <textarea name="data" value={text} onChange={(e) => setText(e.target.value)} rows={5} className="input font-mono text-xs"
        placeholder={"2026.05.08\tAB\t671\n2026.05.08\tAB\t672\n2026.05.09\tAA\t0000225"} spellCheck={false} />
      <div>
        <label className="label">Огноо (мөрөнд огноогүй бол)</label>
        <input type="date" name="date" className="input" defaultValue={today} max={today} />
      </div>

      {parsed && (
        <div className="space-y-2 text-xs">
          <p>
            <b className="text-emerald-700">{rows.length} талон</b>
            {byType.size > 0 && <> · {[...byType].sort((a, b) => b[0] - a[0]).map(([a, n]) => `${fmtMoney(a)} × ${n}`).join(", ")} · нийт <b>{fmtMoney(total)}</b></>}
            {parsed.removed.length > 0 && <span className="text-gray-500"> · {parsed.removed.length} яг ижил давхар мөрийг хасав</span>}
          </p>
          {parsed.errors.length > 0 && (
            <div className="max-h-40 overflow-auto rounded-lg bg-brand-soft px-3 py-2 text-brand">
              <p className="font-medium">Алдаатай {parsed.errors.length} мөр — засаад дахин буулгана уу:</p>
              {parsed.errors.slice(0, 50).map((e) => <p key={e.line}>{e.line}-р мөр: {e.text} — {e.message}</p>)}
            </div>
          )}
          {parsed.duplicates.length > 0 && (
            <div className="max-h-40 overflow-auto rounded-lg bg-brand-soft px-3 py-2 text-brand">
              <p className="font-medium">Нэг сериал өөр огноотой 2 удаа орсон {parsed.duplicates.length} мөр:</p>
              {parsed.duplicates.slice(0, 50).map((d) => (
                <p key={d.line}>{d.serial}: {d.line}-р мөр ({d.text}) ↔ {d.firstLine}-р мөр ({d.firstText})</p>
              ))}
            </div>
          )}
        </div>
      )}
      <p className="text-xs text-gray-500">Зараагүй, өмнө оруулсан талон байвал юу ч бүртгэгдэхгүй, аль талон болохыг харуулна.</p>
      <FormMessage state={state} />
      <button className="btn-primary w-full" disabled={pending || blocked}>
        {pending ? "Импортлож байна..." : `Импортлох${rows.length ? ` (${rows.length})` : ""}`}
      </button>
    </form>
  );
}
