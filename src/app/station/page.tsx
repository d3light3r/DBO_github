import Link from "next/link";
import { redirect } from "next/navigation";
import { stationContext } from "@/lib/station-access";
import { createAdminClient } from "@/lib/supabase/admin";
import { fmtMoney, round2 } from "@/lib/station-calc";
import { fmtDateTime, todayUB } from "@/lib/time";
import type { FuelType, StationShift } from "@/lib/types";
import { saveFuelType } from "./actions";

export default async function StationHome() {
  const { emp, isStaffAdmin, isAdmin, stations } = await stationContext();
  if (!isStaffAdmin && stations.length === 1) redirect(`/station/${stations[0].id}`);
  if (!isStaffAdmin && stations.length === 0) {
    return <p className="card -mt-11 text-sm text-gray-600">Та ШТС-д оноогдоогүй байна. Админд хандана уу.</p>;
  }

  const db = createAdminClient();
  const ids = stations.map((x) => x.id);
  const today = todayUB();
  const [{ data: staff }, { data: openSh }, { data: todaySh }, { data: fuels }] = await Promise.all([
    db.from("employees").select("id, full_name, unit_id, branch:branches(name)").eq("organization_id", emp.organization_id).eq("is_active", true).in("unit_id", ids.length ? ids : [""]),
    db.from("station_shifts").select("*").in("branch_id", ids.length ? ids : [""]).eq("status", "open"),
    db.from("station_shifts").select("branch_id, sales_amount").in("branch_id", ids.length ? ids : [""]).eq("status", "closed").gte("closed_at", `${today}T00:00:00+08:00`),
    isAdmin ? db.from("fuel_types").select("*").eq("organization_id", emp.organization_id).order("name") : Promise.resolve({ data: [] }),
  ]);
  const names = new Map((staff ?? []).map((e) => [e.id, e.full_name as string]));

  return (
    <>
      <section className="card -mt-11">
        <h2 className="font-semibold">Станцууд ({stations.length})</h2>
        <p className="text-xs text-gray-500">Станц бүрийн харьяалал, ажилтан, ээлжийн төлөв. Станц дээр дарж ээлж, тайлан, тохиргоо руу орно.</p>
        {isAdmin && (
          <p className="mt-1 text-xs text-gray-500">
            Шинэ ШТС: <Link href="/admin/settings/structure" className="text-brand underline">Тохиргоо → Компани, бүтэц</Link>-ээс салбар нэмж «⛽ ШТС» гэж
            тэмдэглэнэ. Ажилтныг <Link href="/app/employees" className="text-brand underline">Ажилтан</Link> хэсгээс тухайн салбарт оноо.
          </p>
        )}
      </section>

      <div className="grid gap-3 md:grid-cols-2">
        {stations.map((st) => {
          const myStaff = ((staff ?? []) as unknown as { id: string; full_name: string; unit_id: string; branch: { name: string } | null }[]).filter((e) => e.unit_id === st.id);
          const open = ((openSh ?? []) as StationShift[]).find((x) => x.branch_id === st.id);
          const sales = round2((todaySh ?? []).filter((x) => x.branch_id === st.id).reduce((a, x) => a + Number(x.sales_amount ?? 0), 0));
          return (
            <Link key={st.id} href={`/station/${st.id}`} className={`card block space-y-2 transition hover:ring-brand ${st.is_active ? "" : "opacity-50"}`}>
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-lg font-bold">⛽ {st.name}</h3>
                {open ? (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">Ээлж нээлттэй</span>
                ) : (
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">Ээлж хаалттай</span>
                )}
              </div>
              <dl className="grid grid-cols-[6.5rem_1fr] gap-y-1 text-sm">
                <dt className="text-gray-500">🏢 Харьяалал</dt>
                <dd>{st.company_name} · {st.department_name}</dd>
                <dt className="text-gray-500">👥 Ажилтан ({myStaff.length})</dt>
                <dd>
                  {myStaff.length ? (
                    myStaff.map((e) => (
                      <span key={e.id} className="block">
                        {e.full_name} <span className="text-xs text-gray-400">📍 {e.branch?.name ?? "координатгүй"}</span>
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-400">Оноогоогүй</span>
                  )}
                </dd>
                {open && (
                  <>
                    <dt className="text-gray-500">🕒 Ээлж</dt>
                    <dd>{fmtDateTime(open.opened_at)}-аас · {names.get(open.opened_by) ?? ""}</dd>
                  </>
                )}
                <dt className="text-gray-500">💰 Өнөөдөр</dt>
                <dd className="font-semibold">{fmtMoney(sales)}</dd>
              </dl>
            </Link>
          );
        })}
        {stations.length === 0 && <p className="card text-sm text-gray-500">ШТС салбар алга.</p>}
      </div>

      {isAdmin && (
        <div className="grid gap-4 md:grid-cols-2">
          <section className="card h-fit space-y-2">
            <h2 className="font-semibold">Шатахууны төрөл, үнэ</h2>
            <p className="text-xs text-gray-500">Бүх станцад нийтлэг. Ээлж хаах үеийн үнээр борлуулалт тооцогдоно.</p>
            {((fuels ?? []) as FuelType[]).map((f) => (
              <form key={f.id} action={saveFuelType} className="grid grid-cols-[1fr_6.5rem_auto] items-center gap-2 border-b border-gray-100 pb-2">
                <input type="hidden" name="id" value={f.id} />
                <input name="name" defaultValue={f.name} className="input py-1" required />
                <input name="price" defaultValue={Number(f.price)} inputMode="decimal" className="input py-1 text-right" required />
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1 text-xs" title="Идэвхтэй"><input type="checkbox" name="is_active" defaultChecked={f.is_active} className="accent-brand" />✓</label>
                  <button className="btn-ghost px-2 py-1 text-xs">Хадгалах</button>
                </div>
              </form>
            ))}
            <form action={saveFuelType} className="grid grid-cols-[1fr_6.5rem_auto] items-center gap-2 pt-1">
              <input name="name" className="input py-1" placeholder="АИ-92" required />
              <input name="price" inputMode="decimal" className="input py-1 text-right" placeholder="₮/литр" required />
              <button className="btn-primary px-3 py-1 text-xs">Нэмэх</button>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
