import { notFound } from "next/navigation";
import { requireStationPage } from "@/lib/station-access";
import { createAdminClient } from "@/lib/supabase/admin";
import type { FuelType, Nozzle, Tank } from "@/lib/types";
import { ConfirmButton } from "@/components/confirm-button";
import { assignStaff, saveNozzle, saveTank, unassignStaff } from "../../actions";
import { StationForm } from "../../station-form";

const row = "grid items-center gap-2 border-b border-gray-100 py-2 last:border-0";

export default async function StationSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { emp, station, isAdmin } = await requireStationPage(id);
  if (!isAdmin) notFound();
  const db = createAdminClient();
  const org = emp.organization_id;
  const [{ data: fu }, { data: tk }, { data: nz }, { data: emps }, { data: branches }] = await Promise.all([
    db.from("fuel_types").select("*").eq("organization_id", org).order("name"),
    db.from("station_tanks").select("*").eq("branch_id", id).order("name"),
    db.from("station_nozzles").select("*").eq("branch_id", id).order("name"),
    db.from("employees").select("id, full_name, emp_code, branch_id").eq("organization_id", org).eq("is_active", true).order("full_name"),
    db.from("branches").select("id, name").eq("organization_id", org),
  ]);
  const fuels = (fu ?? []) as FuelType[];
  const tanks = (tk ?? []) as Tank[];
  const nozzles = (nz ?? []) as Nozzle[];
  const fuelName = (fid: string) => fuels.find((f) => f.id === fid)?.name ?? "";
  const branchName = new Map((branches ?? []).map((b) => [b.id, b.name as string]));
  const staff = (emps ?? []).filter((e) => e.branch_id === id);
  const others = (emps ?? []).filter((e) => e.branch_id !== id);

  return (
    <div className="space-y-4">
      <StationForm
        station={{
          id: station.id,
          name: station.name,
          latitude: Number(station.latitude),
          longitude: Number(station.longitude),
          radius_meters: station.radius_meters,
          is_active: station.is_active,
        }}
      />

      {/* ---- Ажилтан ---- */}
      <section className="card space-y-2">
        <h2 className="font-semibold">👥 Энэ станцын ажилтан ({staff.length})</h2>
        <p className="text-xs text-gray-500">
          Энд оноосон ажилтан энэ станцын байршилд ирц бүртгүүлж, ШТС апп-д энэ станцын ээлж нээж/хаана. Ажилтан нэг л салбар/станцтай байна.
        </p>
        {staff.map((e) => (
          <form key={e.id} action={unassignStaff} className={`${row} grid-cols-[1fr_auto]`}>
            <input type="hidden" name="station_id" value={id} />
            <input type="hidden" name="employee_id" value={e.id} />
            <span className="text-sm">{e.full_name} <span className="text-xs text-gray-400">· {e.emp_code}</span></span>
            <ConfirmButton message={`${e.full_name}-ийг энэ станцаас хасах уу? Салбаргүй болно.`}>Хасах</ConfirmButton>
          </form>
        ))}
        {staff.length === 0 && <p className="text-sm text-gray-400">Ажилтан оноогоогүй байна.</p>}
        <form action={assignStaff} className="grid grid-cols-[1fr_auto] gap-2 pt-2">
          <input type="hidden" name="station_id" value={id} />
          <select name="employee_id" className="input" required defaultValue="">
            <option value="" disabled>Ажилтан сонгох</option>
            {others.map((e) => (
              <option key={e.id} value={e.id}>
                {e.full_name}{e.branch_id ? ` (одоо: ${branchName.get(e.branch_id) ?? "—"})` : ""}
              </option>
            ))}
          </select>
          <button className="btn-primary">Оноох</button>
        </form>
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
