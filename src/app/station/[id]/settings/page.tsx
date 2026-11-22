import { notFound } from "next/navigation";
import { requireStationPage } from "@/lib/station-access";
import { createAdminClient } from "@/lib/supabase/admin";
import type { FuelType, Nozzle, Tank } from "@/lib/types";
import Link from "next/link";
import { saveNozzle, saveTank } from "../../actions";

const row = "grid items-center gap-2 border-b border-gray-100 py-2 last:border-0";

export default async function StationSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { emp, isAdmin } = await requireStationPage(id);
  if (!isAdmin) notFound();
  const db = createAdminClient();
  const org = emp.organization_id;
  const [{ data: fu }, { data: tk }, { data: nz }, { data: emps }] = await Promise.all([
    db.from("fuel_types").select("*").eq("organization_id", org).order("name"),
    db.from("station_tanks").select("*").eq("branch_id", id).order("name"),
    db.from("station_nozzles").select("*").eq("branch_id", id).order("name"),
    db.from("employees").select("id, full_name, emp_code, branch:branches(name)").eq("organization_id", org).eq("unit_id", id).eq("is_active", true).order("full_name"),
  ]);
  const fuels = (fu ?? []) as FuelType[];
  const tanks = (tk ?? []) as Tank[];
  const nozzles = (nz ?? []) as Nozzle[];
  const fuelName = (fid: string) => fuels.find((f) => f.id === fid)?.name ?? "";
  const staff = (emps ?? []) as unknown as { id: string; full_name: string; emp_code: string; branch: { name: string } | null }[];

  return (
    <div className="space-y-4">
      {/* ---- Ажилтан (Ажилтан хэсгээс салбар сонгож ононо) ---- */}
      <section className="card space-y-2">
        <h2 className="font-semibold">👥 Энэ ШТС-ийн ажилтан ({staff.length})</h2>
        <ul className="divide-y divide-gray-100 text-sm">
          {staff.map((e) => (
            <li key={e.id} className="flex justify-between py-1.5">
              <span>{e.full_name} <span className="text-xs text-gray-400">· {e.emp_code}</span></span>
              <span className="text-xs text-gray-500">📍 {e.branch?.name ?? "координатгүй"}</span>
            </li>
          ))}
          {staff.length === 0 && <li className="py-1.5 text-gray-400">Ажилтан оноогоогүй байна.</li>}
        </ul>
        <p className="text-xs text-gray-500">
          Ажилтныг <Link href="/app/employees" className="text-brand underline">Цаг бүртгэл апп → Ажилтан</Link> хэсгээс засаж «Салбар»-т энэ ШТС-ийг сонгоно.
          📍 Координат нь ажилтан «Ирлээ» дарах цэг.
        </p>
      </section>

      {/* ---- Сав ---- */}
      <section className="card space-y-1">
        <h2 className="font-semibold">🛢 Сав</h2>
        {tanks.map((t) => (
          <form key={t.id} action={saveTank} className={`${row} grid-cols-2 md:grid-cols-[1fr_8rem_7rem_auto_auto]`}>
            <input type="hidden" name="station_id" value={id} />
            <input type="hidden" name="id" value={t.id} />
            <input name="name" defaultValue={t.name} className="input py-1" required />
            <select name="fuel_type_id" defaultValue={t.fuel_type_id} className="input py-1">
              {fuels.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
            <input name="capacity_liters" defaultValue={t.capacity_liters ?? ""} inputMode="decimal" className="input py-1 text-right" placeholder="Багтаамж л" />
            <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="is_active" defaultChecked={t.is_active} className="accent-brand" />Идэвхтэй</label>
            <button className="btn-ghost px-2 py-1 text-xs">Хадгалах</button>
          </form>
        ))}
        {fuels.length === 0 ? (
          <p className="text-xs text-gray-400">Эхлээд ШТС апп-ын нүүрнээс шатахууны төрөл, үнэ нэмнэ үү.</p>
        ) : (
          <form action={saveTank} className={`${row} grid-cols-2 pt-3 md:grid-cols-[1fr_8rem_7rem_auto]`}>
            <input type="hidden" name="station_id" value={id} />
            <input name="name" className="input py-1" placeholder="Сав-1" required />
            <select name="fuel_type_id" className="input py-1" required defaultValue="">
              <option value="" disabled>Шатахуун</option>
              {fuels.filter((f) => f.is_active).map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
            <input name="capacity_liters" inputMode="decimal" className="input py-1 text-right" placeholder="Багтаамж л" />
            <button className="btn-primary px-3 py-1 text-xs">Сав нэмэх</button>
          </form>
        )}
      </section>

      {/* ---- Хошуу ---- */}
      <section className="card space-y-1">
        <h2 className="font-semibold">⛽ Хошуу (тоолуур)</h2>
        {nozzles.map((n) => (
          <form key={n.id} action={saveNozzle} className={`${row} grid-cols-2 md:grid-cols-[1fr_12rem_auto_auto]`}>
            <input type="hidden" name="station_id" value={id} />
            <input type="hidden" name="id" value={n.id} />
            <input name="name" defaultValue={n.name} className="input py-1" required />
            <select name="tank_id" defaultValue={n.tank_id} className="input py-1">
              {tanks.map((t) => <option key={t.id} value={t.id}>{t.name} · {fuelName(t.fuel_type_id)}</option>)}
            </select>
            <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="is_active" defaultChecked={n.is_active} className="accent-brand" />Идэвхтэй</label>
            <button className="btn-ghost px-2 py-1 text-xs">Хадгалах</button>
          </form>
        ))}
        {tanks.length === 0 ? (
          <p className="text-xs text-gray-400">Эхлээд сав нэмнэ үү.</p>
        ) : (
          <form action={saveNozzle} className={`${row} grid-cols-2 pt-3 md:grid-cols-[1fr_12rem_auto]`}>
            <input type="hidden" name="station_id" value={id} />
            <input name="name" className="input py-1" placeholder="Колонк 1-А" required />
            <select name="tank_id" className="input py-1" required defaultValue="">
              <option value="" disabled>Аль савнаас</option>
              {tanks.filter((t) => t.is_active).map((t) => <option key={t.id} value={t.id}>{t.name} · {fuelName(t.fuel_type_id)}</option>)}
            </select>
            <button className="btn-primary px-3 py-1 text-xs">Хошуу нэмэх</button>
          </form>
        )}
        <p className="pt-2 text-xs text-gray-400">
          Сав, хошуу ээлжийн түүхэнд холбогдсон тул устгахгүй, «Идэвхтэй»-г болиулж нууна. Нээлттэй ээлжийн үед нэмсэн хошуу дараагийн ээлжээс тооцогдоно.
        </p>
      </section>
    </div>
  );
}
