import { requireStaffAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { addDays, fmtDate, fmtMinutes, fmtTime, todayUB } from "@/lib/time";
import { STATUS_LABELS, type AttendanceLog } from "@/lib/types";
import { reviewAttendance } from "../actions";

type Row = AttendanceLog & { employee: { full_name: string; emp_code: string } | null; branch: { name: string } | null };

const isDate = (s?: string) => /^\d{4}-\d{2}-\d{2}$/.test(s ?? "") && !Number.isNaN(Date.parse(s!));

export default async function AdminAttendance({ searchParams }: { searchParams: Promise<{ from?: string; to?: string; trips?: string }> }) {
  const me = await requireStaffAdmin();
  const sp = await searchParams;
  // Сонгоогүй бол эхлэх, дуусах хоёулаа өнөөдөр. Мужийг 93 хоногоор хязгаарлана.
  const today = todayUB();
  const to = isDate(sp.to) ? sp.to! : isDate(sp.from) ? sp.from! : today;
  let from = isDate(sp.from) ? sp.from! : to;
  if (from > to) from = to;
  if (from < addDays(to, -92)) from = addDays(to, -92);
  const tripsOnly = sp.trips === "1";
  const db = createAdminClient();
  let q = db
    .from("attendance_logs")
    .select("*, employee:employees!attendance_logs_employee_id_fkey(full_name, emp_code), branch:branches(name)")
    .eq("organization_id", me.organization_id)
    .order("work_date", { ascending: false })
    .order("check_in_at", { ascending: false });
  q = tripsOnly ? q.eq("review_status", "pending").limit(100) : q.gte("work_date", from).lte("work_date", to).limit(1000);
  const { data } = await q;
  const logs = (data ?? []) as Row[];

  // Сельфи зургийг 10 минутын хүчинтэй холбоосоор харуулна
  const paths = logs.flatMap((l) => [l.in_selfie_path, l.out_selfie_path]).filter(Boolean) as string[];
  const signed = new Map<string, string>();
  if (paths.length) {
    const { data: urls } = await db.storage.from("selfies").createSignedUrls(paths, 600);
    urls?.forEach((u) => u.path && u.signedUrl && signed.set(u.path, u.signedUrl));
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Ирцийн бүртгэл</h1>
      <div className="flex flex-wrap items-center gap-2">
        <form className="flex flex-wrap items-end gap-2">
          <div><label className="label">Эхлэх</label><input type="date" name="from" defaultValue={from} max={today} className="input w-auto" /></div>
          <div><label className="label">Дуусах</label><input type="date" name="to" defaultValue={to} max={today} className="input w-auto" /></div>
          <button className="btn-ghost">Харах</button>
          {(from !== today || to !== today) && <a href="?" className="btn-ghost">Өнөөдөр</a>}
        </form>
        <a href="?trips=1" className={`rounded-full px-3 py-1 text-sm ${tripsOnly ? "bg-brand text-white" : "bg-white ring-1 ring-gray-200"}`}>
          Батлах шаардлагатай томилолт
        </a>
      </div>
      <div className="card overflow-x-auto p-0">
        <table className="table">
          <thead><tr><th>Ажилтан</th><th>Өдөр</th><th>Ирсэн</th><th>Явсан</th><th>Ажилласан</th><th>Хоцролт</th><th>Илүү</th><th>Байршил</th><th>Сельфи</th><th>Төлөв</th></tr></thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id}>
                <td className="font-medium">{l.employee?.full_name}</td>
                <td className="text-xs">{fmtDate(l.work_date)}</td>
                <td>{fmtTime(l.check_in_at)}</td>
                <td>{l.check_out_at ? fmtTime(l.check_out_at) : l.status === "working" ? <span className="text-emerald-600">ажиллаж байна</span> : <span className="text-brand">бүртгээгүй</span>}</td>
                <td>{fmtMinutes(l.worked_minutes)}</td>
                <td className={l.late_minutes ? "text-brand" : ""}>{l.late_minutes ? `${l.late_minutes}м` : "—"}</td>
                <td>{l.overtime_minutes ? fmtMinutes(l.overtime_minutes) : "—"}</td>
                <td className="text-xs">
                  {l.verify_method === "TRIP" ? "Томилолт" : `${l.branch?.name ?? ""} · ${l.verify_method}`}
                  {l.in_lat != null && (
                    <a className="ml-1 text-brand underline" target="_blank" rel="noreferrer" href={`https://www.google.com/maps?q=${l.in_lat},${l.in_lng}`}>газрын зураг</a>
                  )}
                </td>
                <td>
                  <div className="flex gap-1">
                    {[l.in_selfie_path, l.out_selfie_path].map((p, i) =>
                      p && signed.get(p) ? (
                        <a key={i} href={signed.get(p)} target="_blank" rel="noreferrer">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={signed.get(p)} alt="" className="h-10 w-10 rounded object-cover" />
                        </a>
                      ) : null,
                    )}
                  </div>
                </td>
                <td>
                  {l.review_status === "pending" ? (
                    <form action={reviewAttendance} className="flex gap-1">
                      <input type="hidden" name="id" value={l.id} />
                      <button name="decision" value="approved" className="btn bg-emerald-600 px-2 py-1 text-xs text-white">Батлах</button>
                      <button name="decision" value="rejected" className="btn-ghost px-2 py-1 text-xs">Татгалзах</button>
                    </form>
                  ) : (
                    <span className="text-xs text-gray-500">{STATUS_LABELS[l.review_status]}</span>
                  )}
                </td>
              </tr>
            ))}
            {logs.length === 0 && <tr><td colSpan={10} className="py-8 text-center text-gray-400">Бүртгэл алга</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
