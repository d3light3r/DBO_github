import { APPS, ROLE_DEFAULTS } from "@/lib/permissions";
import type { Role } from "@/lib/types";
import { saveEmployeePermissions } from "../permissions/actions";

/**
 * Нэг ажилтны бүх апп: апп бүрийг асааж / унтрааж (апп-д нэмэх / хасах), цэс бүрийг сонгоно.
 * JS-ээс хамааралгүй (энгийн checkbox + CSS) — хуудас бүрэн ачаалагдаагүй үед ч зөв хадгална.
 * Хаалттай апп-ыг асаахад албан тушаалын анхдагч цэсүүд (байхгүй бол бүгд) сонгогдсон харагдана.
 */
export function EmployeeAppsForm({
  empId,
  role,
  q,
  initial,
  stations,
  initialStations,
  stationDefault,
}: {
  empId: string;
  role: Role;
  q: string;
  initial: string[];
  stations: { id: string; name: string; is_active: boolean }[];
  initialStations: string[];
  stationDefault: string;
}) {
  const isAdmin = role === "admin";
  const has = new Set(initial);
  const roleDefaults: string[] = ROLE_DEFAULTS[role] ?? [];

  return (
    <form action={saveEmployeePermissions} className="space-y-3">
      <input type="hidden" name="emp" value={empId} />
      <input type="hidden" name="q" value={q} />

      {APPS.map((app) => {
        const keys: string[] = app.perms.map((p) => p.key);
        const on = isAdmin || keys.some((k) => has.has(k));
        // Апп хаалттай бол асаахад сонгогдох анхдагч цэсүүд
        const defaults = keys.filter((k) => roleDefaults.includes(k));
        const preset = (k: string) => (on ? isAdmin || has.has(k) : (defaults.length ? defaults : keys).includes(k));
        return (
          <section
            key={app.key}
            className="card space-y-3 [&:has(.app-switch:checked)_.when-off]:hidden [&:not(:has(.app-switch:checked))]:bg-gray-50 [&:not(:has(.app-switch:checked))_.when-on]:hidden"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold">{app.title}</p>
                <p className="text-xs text-gray-500">{app.desc}</p>
              </div>
              <label className="flex shrink-0 cursor-pointer items-center gap-2 text-sm">
                <span className="when-on font-semibold text-emerald-700">Нэмэгдсэн</span>
                <span className="when-off text-gray-500">Хандахгүй</span>
                <input
                  type="checkbox"
                  role="switch"
                  name="app"
                  value={app.key}
                  className="app-switch peer sr-only"
                  defaultChecked={on}
                  disabled={isAdmin}
                />
                <span className="relative h-6 w-11 rounded-full bg-gray-300 transition after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition peer-checked:bg-brand peer-checked:after:translate-x-5 peer-focus-visible:ring-2 peer-focus-visible:ring-brand/40" />
              </label>
            </div>
            <div className="when-on grid gap-1 border-t border-gray-100 pt-3 sm:grid-cols-2">
              {app.perms.map((p) => (
                <label key={p.key} className="flex cursor-pointer items-start gap-2 rounded-lg p-1.5 hover:bg-gray-50">
                  <input
                    type="checkbox"
                    name="perm"
                    value={p.key}
                    className="mt-0.5 h-4 w-4 shrink-0"
                    defaultChecked={preset(p.key)}
                    disabled={isAdmin}
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{p.label}</span>
                    <span className="block text-xs text-gray-500">{p.desc}</span>
                  </span>
                </label>
              ))}
            </div>
            {app.key === "station" && (
              <div className="when-on space-y-2 border-t border-gray-100 pt-3 [&:has(.st-pick:checked)_.st-default]:hidden">
                <p className="text-sm font-medium">⛽ Хандах станц</p>
                {isAdmin ? (
                  <p className="text-xs text-gray-500">Админ бүх станцад хандана.</p>
                ) : stations.length === 0 ? (
                  <p className="text-xs text-gray-500">ШТС алга. «Алба хэлтэс»-ээс салбар нэмж «⛽ ШТС» гэж тэмдэглэнэ.</p>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-2">
                      {stations.map((s) => (
                        <label
                          key={s.id}
                          className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-sm ring-1 ring-gray-200 hover:bg-gray-50 has-[:checked]:bg-brand-soft has-[:checked]:ring-brand"
                        >
                          <input
                            type="checkbox"
                            name="station"
                            value={s.id}
                            className="st-pick h-4 w-4"
                            defaultChecked={initialStations.includes(s.id)}
                          />
                          {s.name}
                          {!s.is_active && <span className="text-xs text-gray-400">(идэвхгүй)</span>}
                        </label>
                      ))}
                    </div>
                    <p className="st-default text-xs text-brand">{stationDefault}</p>
                  </>
                )}
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
