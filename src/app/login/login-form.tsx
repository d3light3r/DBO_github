"use client";

import { useActionState } from "react";
import { login } from "./actions";

export function LoginForm() {
  const [error, action, pending] = useActionState(login, null);
  return (
    <form action={action} className="card space-y-3">
      <div>
        <label className="label" htmlFor="phone">Утасны дугаар</label>
        <input id="phone" name="phone" inputMode="tel" autoComplete="username" className="input" placeholder="99112233" required />
      </div>
      <div>
        <label className="label" htmlFor="password">Нууц үг</label>
        <input id="password" name="password" type="password" autoComplete="current-password" className="input" required />
      </div>
      {error && <p className="rounded-lg bg-brand-soft px-3 py-2 text-sm text-brand">{error}</p>}
      <button className="btn-primary w-full py-3" disabled={pending}>
        {pending ? "Түр хүлээнэ үү..." : "Нэвтрэх"}
      </button>
    </form>
  );
}
