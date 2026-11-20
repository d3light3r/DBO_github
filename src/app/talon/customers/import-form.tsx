"use client";

import { useActionState, useState } from "react";
import { importCustomers, type FormState } from "../actions";
import { FormMessage } from "@/components/form-message";
import { parseCustomerPaste } from "@/lib/customer-import";

export function ImportForm() {
  const [text, setText] = useState("");
  const [state, action, pending] = useActionState(async (prev: FormState, f: FormData) => {
    const res = await importCustomers(prev, f);
    if (res?.ok) setText("");
    return res;
  }, null);
  const parsed = text.trim() ? parseCustomerPaste(text) : null;

  return (
    <form action={action} className="card h-fit space-y-3">
      <h2 className="font-semibold">Excel-ээс импортлох</h2>
      <p className="text-xs text-gray-500">
        Excel-ээс хуулаад (Ctrl+C) энд буулгана (Ctrl+V). Нэг нүдэнд <b>«2026813-Тэс Ойл ХХК»</b>, <b>«УУ89021223-Чандмань Батцогт»</b> гэж байсан ч,
        нэр, регистр тусдаа баганад байсан ч танина. 7 оронтой тоо = байгууллага, 2 үсэг + 8 оронтой тоо = хүний регистр, үлдсэн нь нэр.
        3 дахь багана утас, 4 дэх тэмдэглэл (заавал биш).
      </p>
      <textarea
        name="data"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        className="input font-mono text-xs"
        placeholder={"Тэс ХХК\t6123456\t99112233\nНомин ХХК\t2012345"}
        spellCheck={false}
      />
      {parsed && (
        <div className="space-y-2 text-xs">
          <p>
            <b className="text-emerald-700">{parsed.rows.length} мөр бэлэн</b>
            {parsed.duplicates.length > 0 && <span className="text-gray-500"> · {parsed.duplicates.length} давхар регистр алгасна</span>}
            {parsed.errors.length > 0 && <span className="text-brand"> · {parsed.errors.length} алдаатай</span>}
          </p>
          {parsed.errors.length > 0 && (
            <details className="rounded-lg bg-brand-soft px-3 py-2 text-brand">
              <summary className="cursor-pointer font-medium">Алдаатай {parsed.errors.length} мөр (импортлохгүй, алгасна) — харах</summary>
              <div className="mt-2 max-h-48 overflow-auto">
                <table className="table">
                  <thead><tr><th>Мөр</th><th>Текст</th><th>Шалтгаан</th></tr></thead>
                  <tbody>
                    {parsed.errors.map((e) => (
                      <tr key={e.line}><td>{e.line}</td><td className="font-mono">{e.text}</td><td>{e.message}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}
          {parsed.duplicates.length > 0 && (
            <details className="rounded-lg bg-amber-50 px-3 py-2 text-amber-900">
              <summary className="cursor-pointer font-medium">Давхар регистртэй {parsed.duplicates.length} мөр (алгасна) — харах</summary>
              <div className="mt-2 max-h-48 overflow-auto">
                <table className="table">
                  <thead><tr><th>Мөр</th><th>Регистр</th><th>Нэр</th><th>Давхцсан мөр</th></tr></thead>
                  <tbody>
                    {parsed.duplicates.map((d) => (
                      <tr key={d.line}>
                        <td>{d.line}</td>
                        <td className="font-mono">{d.register}</td>
                        <td>{d.name}</td>
                        <td>{d.firstLine}-р мөр{d.firstName !== d.name && <span className="block text-[11px] text-amber-700">{d.firstName}</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-1 text-[11px]">Мөрийн дугаар нь таны буулгасан текстийн мөр (Excel-ийн гарчигтай бол Excel-ийн мөрийн дугаартай ижил).</p>
            </details>
          )}
          {parsed.rows.length > 0 && (
            <div className="max-h-48 overflow-auto rounded-lg ring-1 ring-gray-200">
              <table className="table">
                <thead><tr><th>Нэр</th><th>Регистр</th><th>Утас</th><th>Тэмдэглэл</th></tr></thead>
                <tbody>
                  {parsed.rows.slice(0, 50).map((r) => (
                    <tr key={r.line}>
                      <td>{r.name}</td>
                      <td className="whitespace-nowrap font-mono">{r.register} <span className="font-sans text-[10px] text-gray-400">{r.kind === "org" ? "ААН" : "хүн"}</span></td>
                      <td>{r.phone ?? "—"}</td>
                      <td>{r.note ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsed.rows.length > 50 && <p className="px-3 py-1 text-gray-400">... бусад {parsed.rows.length - 50} мөр</p>}
            </div>
          )}
        </div>
      )}
      <FormMessage state={state} />
      <button className="btn-primary" disabled={pending || !parsed || parsed.rows.length === 0}>
        {pending ? "Импортлож байна..." : `Импортлох${parsed?.rows.length ? ` (${parsed.rows.length})` : ""}`}
      </button>
    </form>
  );
}
