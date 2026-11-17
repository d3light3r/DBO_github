"use client";

import { useActionState, useEffect, useRef } from "react";
import { submitRequest } from "../actions";
import { REQUEST_LABELS } from "@/lib/types";

export function RequestForm() {
  const [state, action, pending] = useActionState(submitRequest, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);

  return (
    <form ref={ref} action={action} className="card space-y-3">
      <h2 className="text-sm font-semibold">Шинэ хүсэлт</h2>
      <div>
        <label className="label">Төрөл</label>
        <select name="type" className="input" required defaultValue="">
          <option value="" disabled>Сонгох</option>
          {Object.entries(REQUEST_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label">Эхлэх</label>
          <input type="datetime-local" name="start_at" className="input" required />
        </div>
        <div>
          <label className="label">Дуусах</label>
          <input type="datetime-local" name="end_at" className="input" required />
        </div>
      </div>
      <div>
        <label className="label">Шалтгаан</label>
        <textarea name="reason" rows={2} className="input" required />
      </div>
      {state && (
        <p className={`rounded-lg px-3 py-2 text-sm ${state.ok ? "bg-emerald-50 text-emerald-700" : "bg-brand-soft text-brand"}`}>{state.message}</p>
      )}
      <button className="btn-primary w-full" disabled={pending}>{pending ? "Илгээж байна..." : "Илгээх"}</button>
    </form>
  );
}
