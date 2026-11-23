"use client";

import { useState } from "react";
import { APPS, ROLE_DEFAULTS } from "@/lib/permissions";
import type { Role } from "@/lib/types";
import { saveEmployeePermissions } from "../permissions/actions";

type App = (typeof APPS)[number];

/**
 * Нэг ажилтны бүх апп: апп бүрийг асааж / унтрааж (апп-д нэмэх / хасах), цэс бүрийг сонгоно.
 * Апп асаахад албан тушаалын анхдагч цэсүүд (байхгүй бол бүгд) сонгогдоно.
 */
export function EmployeeAppsForm({
  empId,
  role,
  q,
  initial,
  notes,
}: {
  empId: string;
  role: Role;
  q: string;
  initial: string[];
  notes: Partial<Record<string, string>>;
}) {
  const [checked, setChecked] = useState(() => new Set(initial));
  const isAdmin = role === "admin";

  const toggle = (key: string, on: boolean) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });

  const setApp = (app: App, on: boolean) =>
    setChecked((prev) => {
      const next = new Set(prev);
      const keys: string[] = app.perms.map((p) => p.key);
      if (!on) keys.forEach((k) => next.delete(k));
      else {
        const roleDefaults: string[] = ROLE_DEFAULTS[role] ?? [];
        const defaults = keys.filter((k) => roleDefaults.includes(k));
        (defaults.length ? defaults : keys).forEach((k) => next.add(k));
      }
      return next;
    });

  return (
    <form action={saveEmployeePermissions} className="space-y-3">
      <input type="hidden" name="emp" value={empId} />
      <input type="hidden" name="q" value={q} />
      {[...checked].map((k) => (
        <input key={k} type="hidden" name="perm" value={k} />
      ))}

      {APPS.map((app) => {
        const on = isAdmin || app.perms.some((p) => checked.has(p.key));
        return (
          <section key={app.key} className={`card space-y-3 ${on ? "" : "bg-gray-50"}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold">{app.title}</p>
                <p className="text-xs text-gray-500">{app.desc}</p>
                {notes[app.key] && on && <p className="mt-1 text-xs text-brand">{notes[app.key]}</p>}
              </div>
              <label className="flex shrink-0 cursor-pointer items-center gap-2 text-sm">
                <span className={on ? "font-semibold text-emerald-700" : "text-gray-500"}>{on ? "Нэмэгдсэн" : "Хандахгүй"}</span>
                <input
                  type="checkbox"
                  role="switch"
                  className="peer sr-only"
                  checked={on}
                  disabled={isAdmin}
                  onChange={(e) => setApp(app, e.target.checked)}
                />
                <span className="relative h-6 w-11 rounded-full bg-gray-300 transition after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition peer-checked:bg-brand peer-checked:after:translate-x-5 peer-focus-visible:ring-2 peer-focus-visible:ring-brand/40" />
              </label>
            </div>
            {on && (
              <div className="grid gap-1 border-t border-gray-100 pt-3 sm:grid-cols-2">
                {app.perms.map((p) => (
                  <label key={p.key} className="flex cursor-pointer items-start gap-2 rounded-lg p-1.5 hover:bg-gray-50">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 shrink-0"
                      checked={isAdmin || checked.has(p.key)}
                      disabled={isAdmin}
                      onChange={(e) => toggle(p.key, e.target.checked)}
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">{p.label}</span>
                      <span className="block text-xs text-gray-500">{p.desc}</span>
                    </span>
                  </label>
                ))}
              </div>
            )}
          </section>
        );
      })}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-gray-500">
          {isAdmin
            ? "Админ үргэлж бүх апп, бүх цэсийн эрхтэй."
            : "«Хандахгүй» апп ажилтны цэсэнд харагдахгүй, хаягаар нь ч орох боломжгүй. Бүх цэсийг арилгавал апп-аас хасагдана."}
        </p>
        {!isAdmin && <button className="btn-primary">Хадгалах</button>}
      </div>
    </form>
  );
}
