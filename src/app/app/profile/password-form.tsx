"use client";

import { useActionState } from "react";
import { changePassword } from "../actions";

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePassword, null);
  return (
    <form action={action} className="card space-y-2">
      <h2 className="text-sm font-semibold">Нууц үг солих</h2>
      <input name="password" type="password" placeholder="Шинэ нууц үг" className="input" autoComplete="new-password" required />
      <input name="password2" type="password" placeholder="Давтах" className="input" autoComplete="new-password" required />
      {state && <p className={`text-sm ${state.ok ? "text-emerald-700" : "text-brand"}`}>{state.message}</p>}
      <button className="btn-primary w-full" disabled={pending}>Хадгалах</button>
    </form>
  );
}
