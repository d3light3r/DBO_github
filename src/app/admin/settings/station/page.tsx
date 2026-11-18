import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { FuelType, Nozzle, Tank } from "@/lib/types";
import { saveFuelType, saveNozzle, saveTank, setStationBranch } from "../../actions";

const row = "grid items-center gap-2 border-b border-gray-100 py-2 last:border-0";

export default async function StationSettingsPage() {
  const me = await requireAdmin();
  const db = createAdminClient();
  const org = me.organization_id;
  const [{ data: br }, { data: fu }, { data: tk }, { data: nz }] = await Promise.all([
    db.from("branches").select("id, name, is_station, is_active").eq("organization_id", org).order("name"),
    db.from("fuel_types").select("*").eq("organization_id", org).order("name"),
    db.from("station_tanks").select("*").eq("organization_id", org).order("name"),
    db.from("station_nozzles").select("*").eq("organization_id", org).order("name"),
  ]);
  const branches = br ?? [];
  const fuels = (fu ?? []) as FuelType[];
  const tanks = (tk ?? []) as Tank[];
  const nozzles = (nz ?? []) as Nozzle[];
  const stations = branches.filter((b) => b.is_station);
  const fuelName = (id: string) => fuels.find((f) => f.id === id)?.name ?? "";

  return (
    <div className="space-y-6">
      {/* ---- Станц ---- */}
      <section className="card max-w-2xl space-y-2">
        <h2 className="font-semibold">1. Аль салбар ШТС вэ?</h2>
        <p className="text-xs text-gray-500">
          ШТС гэж тэмдэглэсэн салбарт оноогдсон ажилтны апп-д «⛽ ШТС» цэс гарч, ээлж нээх/хаах, түлш хүлээн авах боломжтой болно.
        </p>
        {branches.map((b) => (
          <form key={b.id} action={setStationBranch} className={`${row} grid-cols-[1fr_auto]`}>
            <input type="hidden" name="id" value={b.id} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="is_station" defaultChecked={b.is_station} className="h-4 w-4 accent-brand" />
              {b.name} {!b.is_active && <span className="text-xs text-gray-400">(идэвхгүй)</span>}
            </label>
            <button className="btn-ghost px-2 py-1 text-xs">Хадгалах</button>
          </form>
        ))}
        {branches.length === 0 && <p className="text-sm text-gray-400">Эхлээд «Салбар, байршил» табаас салбар нэмнэ үү.</p>}
      </section>

      {/* ---- Шатахуун ---- */}
      <section className="card max-w-2xl space-y-2">
        <h2 className="font-semibold">2. Шатахууны төрөл, үнэ</h2>
        <p className="text-xs text-gray-500">Үнэ өөрчлөгдвөл энд засна. Ээлж хаах үеийн үнээр борлуулалт тооцогдож, түүхэнд хадгалагдана.</p>
        {fuels.map((f) => (
          <form key={f.id} action={saveFuelType} className={`${row} grid-cols-[1fr_8rem_auto_auto]`}>
            <input type="hidden" name="id" value={f.id} />
            <input name="name" defaultValue={f.name} className="input py-1" required />
            <input name="price" defaultValue={Number(f.price)} inputMode="decimal" className="input py-1 text-right" required />
            <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="is_active" defaultChecked={f.is_active} className="accent-brand" />Идэвхтэй</label>
            <button className="btn-ghost px-2 py-1 text-xs">Хадгалах</button>
          </form>
        ))}
        <form action={saveFuelType} className={`${row} grid-cols-[1fr_8rem_auto] pt-3`}>
          <input name="name" className="input py-1" placeholder="АИ-92, Дизель..." required />
          <input name="price" inputMode="decimal" className="input py-1 text-right" placeholder="₮ / литр" required />
          <button className="btn-primary px-3 py-1 text-xs">Нэмэх</button>
        </form>
      </section>

      {/* ---- Станц бүрийн сав, хошуу ---- */}
      {stations.length === 0 ? (
        <p className="text-sm text-gray-400">1-р хэсэгт ШТС салбар тэмдэглэсний дараа сав, хошуу тохируулна.</p>
      ) : (
        stations.map((b) => {
          const myTanks = tanks.filter((t) => t.branch_id === b.id);
          const myNozzles = nozzles.filter((n) => n.branch_id === b.id);
          return (
            <section key={b.id} className="card max-w-3xl space-y-4">
              <h2 className="font-semibold">⛽ {b.name}</h2>

              <div>
                <h3 className="text-sm font-medium">Сав</h3>
                {myTanks.map((t) => (
                  <form key={t.id} action={saveTank} className={`${row} grid-cols-2 md:grid-cols-[1fr_9rem_8rem_auto_auto]`}>
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
                  <p className="text-xs text-gray-400">Эхлээд шатахууны төрөл нэмнэ үү.</p>
                ) : (
                  <form action={saveTank} className={`${row} grid-cols-2 pt-3 md:grid-cols-[1fr_9rem_8rem_auto]`}>
                    <input type="hidden" name="branch_id" value={b.id} />
                    <input name="name" className="input py-1" placeholder="Сав-1" required />
                    <select name="fuel_type_id" className="input py-1" required defaultValue="">
                      <option value="" disabled>Шатахуун</option>
                      {fuels.filter((f) => f.is_active).map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                    <input name="capacity_liters" inputMode="decimal" className="input py-1 text-right" placeholder="Багтаамж л" />
                    <button className="btn-primary px-3 py-1 text-xs">Сав нэмэх</button>
                  </form>
                )}
              </div>

              <div>
                <h3 className="text-sm font-medium">Хошуу (тоолуур)</h3>
                {myNozzles.map((n) => (
                  <form key={n.id} action={saveNozzle} className={`${row} grid-cols-2 md:grid-cols-[1fr_12rem_auto_auto]`}>
                    <input type="hidden" name="id" value={n.id} />
                    <input name="name" defaultValue={n.name} className="input py-1" required />
                    <select name="tank_id" defaultValue={n.tank_id} className="input py-1">
                      {myTanks.map((t) => <option key={t.id} value={t.id}>{t.name} · {fuelName(t.fuel_type_id)}</option>)}
                    </select>
                    <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="is_active" defaultChecked={n.is_active} className="accent-brand" />Идэвхтэй</label>
                    <button className="btn-ghost px-2 py-1 text-xs">Хадгалах</button>
                  </form>
                ))}
                {myTanks.length === 0 ? (
                  <p className="text-xs text-gray-400">Эхлээд сав нэмнэ үү.</p>
                ) : (
                  <form action={saveNozzle} className={`${row} grid-cols-2 pt-3 md:grid-cols-[1fr_12rem_auto]`}>
                    <input name="name" className="input py-1" placeholder="Колонк 1-А" required />
                    <select name="tank_id" className="input py-1" required defaultValue="">
                      <option value="" disabled>Аль савнаас</option>
                      {myTanks.filter((t) => t.is_active).map((t) => <option key={t.id} value={t.id}>{t.name} · {fuelName(t.fuel_type_id)}</option>)}
                    </select>
                    <button className="btn-primary px-3 py-1 text-xs">Хошуу нэмэх</button>
                  </form>
                )}
              </div>
              <p className="text-xs text-gray-400">
                Сав, хошуу нь ээлжийн түүхэнд холбогдсон тул устгахгүй, «Идэвхтэй»-г болиулж нууна. Нээлттэй ээлжийн үед хошуу нэмбэл дараагийн ээлжээс тооцогдоно.
              </p>
            </section>
          );
        })
      )}
    </div>
  );
}
