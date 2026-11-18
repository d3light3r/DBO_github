import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { fmtDateTime } from "@/lib/time";
import type { Device } from "@/lib/types";
import { ConfirmButton } from "@/components/confirm-button";
import { approveDevice, removeDevice, setRequireDevice } from "../../actions";

type Row = Device & { employee: { full_name: string; emp_code: string; phone: string } | null };

export default async function DevicesPage() {
  const me = await requireAdmin();
  const db = createAdminClient();
  const [{ data: org }, { data }] = await Promise.all([
    db.from("organizations").select("require_device").eq("id", me.organization_id).maybeSingle(),
    db
      .from("devices")
      .select("*, employee:employees!devices_employee_id_fkey(full_name, emp_code, phone)")
      .eq("organization_id", me.organization_id)
      .order("created_at", { ascending: false }),
  ]);
  const rows = (data ?? []) as Row[];
  const pending = rows.filter((r) => r.status === "pending");
  const approved = rows.filter((r) => r.status === "approved");

  return (
    <div className="space-y-6">
      <form action={setRequireDevice} className="card flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-start gap-3">
          <input type="checkbox" name="require_device" defaultChecked={org?.require_device ?? true} className="mt-1 h-4 w-4 accent-brand" />
          <span>
            <span className="font-semibold">Зөвхөн бүртгэлтэй утаснаас цаг бүртгүүлэх</span>
            <span className="block text-xs text-gray-500">
              Асаалттай үед ажилтан зөвхөн админ баталсан өөрийн утаснаас ирлээ/явлаа дарна. Өөр хүний нэр, нууц үгээр нэвтэрсэн ч
              тэр хүний утас биш тул бүртгэгдэхгүй.
            </span>
          </span>
        </label>
        <button className="btn-ghost">Хадгалах</button>
      </form>

      <section className="card space-y-3">
        <h2 className="font-semibold">Батлах хүсэлт ({pending.length})</h2>
        {pending.length === 0 ? (
          <p className="text-sm text-gray-400">Хүлээгдэж буй хүсэлт алга. Ажилтан утаснаасаа апп-д ороод «Энэ утсыг бүртгүүлэх» дарахад энд гарна.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead><tr><th>Ажилтан</th><th>Утас</th><th>Хүсэлт илгээсэн</th><th></th></tr></thead>
              <tbody>
                {pending.map((d) => (
                  <tr key={d.id}>
                    <td><div className="font-medium">{d.employee?.full_name}</div><div className="text-xs text-gray-400">{d.employee?.emp_code} · {d.employee?.phone}</div></td>
                    <td className="text-xs">{d.label ?? "—"}</td>
                    <td className="text-xs">{fmtDateTime(d.created_at)}</td>
                    <td>
                      <div className="flex gap-1">
                        <form action={approveDevice}>
                          <input type="hidden" name="id" value={d.id} />
                          <button className="btn bg-emerald-600 px-2 py-1 text-xs text-white">Батлах</button>
                        </form>
                        <form action={removeDevice}>
                          <input type="hidden" name="id" value={d.id} />
                          <button className="btn-ghost px-2 py-1 text-xs">Татгалзах</button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-gray-500">
          Батлахаас өмнө тухайн ажилтан өөрөө, өөрийн утаснаас хүсэлт илгээснийг шалгаарай. Ажилтан өмнө нь өөр утас бүртгүүлсэн бол
          батлахад хуучин утас нь автоматаар цуцлагдана.
        </p>
      </section>

      <section className="card space-y-3">
        <h2 className="font-semibold">Бүртгэлтэй утас ({approved.length})</h2>
        <div className="overflow-x-auto">
          <table className="table">
            <thead><tr><th>Ажилтан</th><th>Утас</th><th>Баталсан</th><th>Сүүлд ашигласан</th><th></th></tr></thead>
            <tbody>
              {approved.map((d) => (
                <tr key={d.id}>
                  <td><div className="font-medium">{d.employee?.full_name}</div><div className="text-xs text-gray-400">{d.employee?.emp_code}</div></td>
                  <td className="text-xs">{d.label ?? "—"}</td>
                  <td className="text-xs">{d.approved_at ? fmtDateTime(d.approved_at) : "—"}</td>
                  <td className="text-xs">{d.last_used_at ? fmtDateTime(d.last_used_at) : "—"}</td>
                  <td>
                    <form action={removeDevice}>
                      <input type="hidden" name="id" value={d.id} />
                      <ConfirmButton message={`${d.employee?.full_name}-ийн утасны бүртгэлийг цуцлах уу? Дахин бүртгүүлэх хүртэл цаг бүртгүүлэх боломжгүй болно.`}>
                        Цуцлах
                      </ConfirmButton>
                    </form>
                  </td>
                </tr>
              ))}
              {approved.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-gray-400">Бүртгэлтэй утас алга</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-500">Ажилтан утсаа сольсон, гээсэн бол «Цуцлах» дараад шинэ утаснаас нь дахин бүртгүүлнэ.</p>
      </section>
    </div>
  );
}
