import { redirect } from "next/navigation";
import { can } from "@/lib/permissions";
import { requireStationPage } from "@/lib/station-access";
import { createAdminClient } from "@/lib/supabase/admin";
import { fmtMoney } from "@/lib/talon";
import { addDays, todayUB } from "@/lib/time";
import { RedeemForm } from "./redeem-form";
import { RedeemImportForm } from "./redeem-import-form";

type Totals = { today_cnt: number; today_amount: number; shift_cnt: number; shift_amount: number };

/** Ашигласан талон бүртгэх: маягт, (эрхтэй бол) импорт, өнөөдөр / ээлжийн дүн */
export default async function StationTalons({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { emp, station } = await requireStationPage(id);
  const redeem = can(emp, "station.talon.redeem");
  const stationImport = can(emp, "station.talon.import");
  if (!redeem && !stationImport) redirect(can(emp, "station.talon.search") ? `/station/${id}/talons/search` : `/station/${id}`);
  const db = createAdminClient();
  const today = todayUB();

  const [settings, open] = await Promise.all([
    db.from("talon_settings").select("*").eq("organization_id", emp.organization_id).maybeSingle(),
    db.from("station_shifts").select("id").eq("branch_id", station.id).eq("status", "open").maybeSingle(),
  ]);
  const { data: totalsRow } = await db.rpc("talon_station_totals", { p_unit: station.id, p_shift: open.data?.id ?? null }).maybeSingle<Totals>();
  const back = settings.data?.backdate_days ?? 0;

  return (
    <>
      {redeem && <RedeemForm stationId={station.id} today={today} minDate={addDays(today, -back)} />}
      {stationImport && <RedeemImportForm stationId={station.id} stationName={station.name} today={today} />}

      <div className="grid grid-cols-2 gap-3">
        <div className="card">
          <p className="text-xs text-gray-500">Өнөөдөр оруулсан</p>
          <p className="text-lg font-bold tabular-nums">{fmtMoney(Number(totalsRow?.today_amount ?? 0))}</p>
          <p className="text-xs text-gray-500">{Number(totalsRow?.today_cnt ?? 0)} ширхэг</p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-500">Нээлттэй ээлжинд</p>
          {open.data ? (
            <>
              <p className="text-lg font-bold tabular-nums">{fmtMoney(Number(totalsRow?.shift_amount ?? 0))}</p>
              <p className="text-xs text-gray-500">{Number(totalsRow?.shift_cnt ?? 0)} ширхэг · ээлж хаахад «Талон»-д орно</p>
            </>
          ) : (
            <p className="mt-1 text-sm text-gray-400">Ээлж хаалттай</p>
          )}
        </div>
      </div>
    </>
  );
}
