"use client";

import { useActionState, useMemo, useState } from "react";
import { importTalons, type FormState } from "../actions";
import { FormMessage } from "@/components/form-message";
import { fmtMoney } from "@/lib/talon";
import { customerMatcher, parseTalonPaste, type CustomerRef } from "@/lib/talon-import";

export function TalonImportForm({ customers, today }: { customers: CustomerRef[]; today: string }) {
  const [text, setText] = useState("");
  const [state, action, pending] = useActionState(async (prev: FormState, f: FormData) => {
    const res = await importTalons(prev, f);
    if (res?.ok) setText("");
    return res;
  }, null);

  const find = useMemo(() => customerMatcher(customers), [customers]);
  const parsed = useMemo(() => (text.trim() ? parseTalonPaste(text) : null), [text]);
  const view = parsed?.rows.map((r) => ({ ...r, match: find(r.customerName, r.customerRegister) })) ?? [];
  const unknown = new Set(view.filter((v) => !v.match).map((v) => v.customerName || v.customerRegister));
  const byType = new Map<number, number>();
  view.forEach((v) => byType.set(v.amount, (byType.get(v.amount) ?? 0) + 1));
  const total = view.reduce((t, v) => t + v.amount, 0);
  const blocked = !parsed || view.length === 0 || parsed.errors.length > 0 || parsed.duplicates.length > 0;

  return (
    <form action={action} className="card space-y-3">
      <h2 className="font-semibold">Excel-ээс импортлох (зарагдсан талон)</h2>
      <p className="text-xs text-gray-500">
        Мөр бүр: <b>Зарсан огноо · Харилцагч · AB · 1234567</b> (жнь 2026.05.08 · Эс Ти Юу · AB · 1234567). «AB1234567» нэг баганад байсан ч болно.
        Харилцагч нь нэр, регистр эсвэл «2026813-Тэс Ойл ХХК» байж болно; нэг харилцагчид олон талон байж болно.
        Тоо 7-оос цөөн оронтой бол урдаас нь 0-ээр нөхнө. Огноогүй мөрийг доорх огноогоор бүртгэнэ.
      </p>
      <textarea name="data" value={text} onChange={(e) => setText(e.target.value)} rows={6} className="input font-mono text-xs"
        placeholder={"2026.05.08\tЭс Ти Юу\tAB\t1234567\n2026.05.08\tЭс Ти Юу\tAB\t1234568\n2026.05.09\t2026813-Тэс Ойл ХХК\tAA\t0000225"} spellCheck={false} />
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label">Зарсан огноо (мөрөнд огноогүй бол)</label>
          <input type="date" name="sold_date" className="input" defaultValue={today} max={today} />
        </div>
        <label className="flex items-end gap-2 pb-2 text-sm">
          <input type="checkbox" name="create_missing" className="accent-brand" /> Олдоогүй харилцагчийг шинээр үүсгэх
        </label>
      </div>

      {parsed && (
        <div className="space-y-2 text-xs">
          <p>
            <b className="text-emerald-700">{view.length} талон</b> · {[...byType].sort((a, b) => b[0] - a[0]).map(([a, n]) => `${fmtMoney(a)} × ${n}`).join(", ")} · нийт <b>{fmtMoney(total)}</b>
            {unknown.size > 0 && <span className="text-amber-700"> · {unknown.size} бүртгэлгүй харилцагч</span>}
            {parsed.removed.length > 0 && <span className="text-gray-500"> · {parsed.removed.length} яг ижил давхар мөрийг хасав</span>}
          </p>
          {parsed.errors.length > 0 && (
            <div className="rounded-lg bg-brand-soft px-3 py-2 text-brand">
              <p className="font-medium">Алдаатай {parsed.errors.length} мөр — засаад дахин буулгана уу:</p>
              {parsed.errors.slice(0, 20).map((e) => <p key={e.line}>{e.line}-р мөр: {e.text} — {e.message}</p>)}
            </div>
          )}
          {parsed.duplicates.length > 0 && (
            <div className="rounded-lg bg-brand-soft px-3 py-2 text-brand">
              <p className="font-medium">Нэг сериал өөр харилцагч эсвэл өөр огноотойгоор 2 удаа орсон {parsed.duplicates.length} мөр. Аль нь зөв болохыг Excel дээрээ шалгаад нэгийг нь хасна уу:</p>
              <div className="mt-1 max-h-56 overflow-auto">
                <table className="table">
                  <thead><tr><th>Сериал</th><th>Мөр</th><th>Мөрийн агуулга</th><th>Давхцсан мөр</th><th>Түүний агуулга</th></tr></thead>
                  <tbody>
                    {parsed.duplicates.map((d) => (
                      <tr key={d.line}>
                        <td className="font-mono">{d.serial}</td>
                        <td>{d.line}</td>
                        <td className="font-mono">{d.text}</td>
                        <td>{d.firstLine}</td>
                        <td className="font-mono">{d.firstText}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {view.length > 0 && (
            <div className="max-h-56 overflow-auto rounded-lg ring-1 ring-gray-200">
              <table className="table">
                <thead><tr><th>Мөр</th><th>Харилцагч</th><th>Сериал</th><th className="text-right">Үнэ</th><th>Огноо</th></tr></thead>
                <tbody>
                  {view.slice(0, 100).map((v) => (
                    <tr key={v.line}>
                      <td>{v.line}</td>
                      <td>
                        {v.match ? (v.match.name || v.match.register) : (
                          <span className="text-amber-700">{v.customerName || v.customerRegister} <span className="text-[10px]">(бүртгэлгүй)</span></span>
                        )}
                      </td>
                      <td className="font-mono">{v.serial}</td>
                      <td className="text-right">{fmtMoney(v.amount)}</td>
                      <td>{v.date ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {view.length > 100 && <p className="px-3 py-1 text-gray-400">... бусад {view.length - 100} мөр</p>}
            </div>
          )}
        </div>
      )}
      <p className="text-xs text-gray-500">Системд аль хэдийн зарагдсан сериал байвал, эсвэл аль нэг мөр алдаатай бол юу ч бүртгэгдэхгүй.</p>
      <FormMessage state={state} />
      <button className="btn-primary" disabled={pending || blocked}>
        {pending ? "Импортлож байна..." : `Импортлох${view.length ? ` (${view.length})` : ""}`}
      </button>
    </form>
  );
}
