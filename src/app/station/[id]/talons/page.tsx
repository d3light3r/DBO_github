import { requireStationPage } from "@/lib/station-access";
import { createAdminClient } from "@/lib/supabase/admin";
import { customerLabel, fmtMoney, groupRuns } from "@/lib/talon";
import { addDays, fmtDate, fmtDateTime, todayUB } from "@/lib/time";
import { RedeemForm } from "./redeem-form";
import { RedeemImportForm } from "./redeem-import-form";

type Row = {
  serial: string;
  redeemed_date: string;
  redeemed_recorded_at: string;
  customer: { name: string; register: string | null } | null;
  redeemer: { full_name: string } | null;
};
type Totals = { today_cnt: number; today_amount: number; shift_cnt: number; shift_amount: number };

export default async function StationTalons({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { emp, station } = await requireStationPage(id);
  const db = createAdminClient();
  const today = todayUB();

  const [settings, open, recent] = await Promise.all([
    db.from("talon_settings").select("backdate_days").eq("organization_id", emp.organization_id).maybeSingle(),
    db.from("station_shifts").select("id").eq("branch_id", station.id).eq("status", "open").maybeSingle(),
    db.from("talons")
      .select("serial, redeemed_date, redeemed_recorded_at, customer:customers(name, register), redeemer:employees!talons_redeemed_by_fkey(full_name)")
      .eq("redeemed_branch_id", station.id)
      .gte("redeemed_recorded_at", `${addDays(today, -6)}T00:00:00+08:00`)
      .order("redeemed_recorded_at", { ascending: false })
      .limit(1000),
  ]);
  const { data: totalsRow } = await db.rpc("talon_station_totals", { p_unit: station.id, p_shift: open.data?.id ?? null }).maybeSingle<Totals>();
  const back = settings.data?.backdate_days ?? 0;
  // Импорт түр нээлттэй эсэх (0008 ажиллаагүй бол багана байхгүй → хаалттай)
  const { data: imp } = await db.from("talon_settings").select("station_import").eq("organization_id", emp.organization_id).maybeSingle();
  const rows = (recent.data ?? []) as unknown as Row[];
  // Нэг удаад бүртгэсэн дараалсан сериалуудыг нэг мөр болгоно
  const runs = groupRuns(rows, (r) => r.redeemed_recorded_at + r.redeemed_date).sort((a, b) =>
    b.first.redeemed_recorded_at.localeCompare(a.first.redeemed_recorded_at),
  );

  return (
    <>
      <RedeemForm stationId={station.id} today={today} minDate={addDays(today, -back)} />
      {imp?.station_import && <RedeemImportForm stationId={station.id} stationName={station.name} today={today} />}

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

      <section className="card">
        <h2 className="mb-2 text-sm font-semibold">Сүүлийн 7 хоногт оруулсан</h2>
        {runs.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-400">Оруулсан талон алга</p>
        ) : (
          <ul className="divide-y divide-gray-100 text-sm">
            {runs.map((r) => (
              <li key={r.from + r.first.redeemed_recorded_at} className="py-2">
                <div className="flex justify-between gap-2">
                  <span className="font-mono text-xs">{r.from}{r.count > 1 && ` – ${r.to}`}</span>
                  <b className="tabular-nums">{fmtMoney(r.amount * r.count)}</b>
                </div>
                <p className="text-xs text-gray-500">
                  {fmtMoney(r.amount)} × {r.count} · {customerLabel(r.first.customer)} · огноо {fmtDate(r.first.redeemed_date)}
                </p>
                <p className="text-[11px] text-gray-400">{r.first.redeemer?.full_name} · {fmtDateTime(r.first.redeemed_recorded_at)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
