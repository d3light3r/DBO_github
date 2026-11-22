import { requirePerm } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { fmtDateTime } from "@/lib/time";
import type { Device } from "@/lib/types";
import { ConfirmButton } from "@/components/confirm-button";
import { AutoCheckbox } from "@/components/auto-checkbox";
import { approveDevice, removeDevice, setAllRequireDevice, setEmployeeRequireDevice } from "@/app/admin/actions";

type Emp = { id: string; full_name: string; emp_code: string; require_device: boolean; is_active: boolean; unit_id: string | null; department_id: string | null };

export default async function DevicesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const me = await requirePerm("attendance.devices", "/app");
  const { q = "" } = await searchParams;
  const db = createAdminClient();
  const org = me.organization_id;
  const [{ data: e }, { data: d }, { data: units }, { data: depts }] = await Promise.all([
    db.from("employees").select("id, full_name, emp_code, require_device, is_active, unit_id, department_id").eq("organization_id", org).order("is_active", { ascending: false }).order("full_name"),
    db.from("devices").select("*").eq("organization_id", org),
    db.from("units").select("id, name").eq("organization_id", org),
    db.from("departments").select("id, name").eq("organization_id", org),
  ]);
  const devices = (d ?? []) as Device[];
  const unitName = new Map((units ?? []).map((x) => [x.id, x.name as string]));
  const deptName = new Map((depts ?? []).map((x) => [x.id, x.name as string]));
  const term = q.trim().toLowerCase();
  const emps = ((e ?? []) as Emp[]).filter((x) => !term || x.full_name.toLowerCase().includes(term) || x.emp_code.toLowerCase().includes(term));
  const pendingCount = devices.filter((x) => x.status === "pending").length;
  // Хүлээгдэж буй хүсэлттэй ажилтныг эхэнд
  emps.sort((a, b) => Number(devices.some((x) => x.employee_id === b.id && x.status === "pending")) - Number(devices.some((x) => x.employee_id === a.id && x.status === "pending")));

  return (
    <div className="space-y-4">
      <div className="card space-y-2 text-sm text-gray-600">
        <p>
          <b>«Утасны бүртгэл»</b> чагттай ажилтан зөвхөн админ баталсан <b>өөрийн утаснаас</b> ирлээ/явлаа дарна. Өөр хүний нэр, нууц үгээр нэвтэрсэн
          ч тэр хүний утас биш тул бүртгэгдэхгүй. Шинэ ажилтан заавал утсаа бүртгүүлнэ. Түр цуцлах бол чагтыг авна.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <form action={setAllRequireDevice}>
            <input type="hidden" name="value" value="on" />
            <ConfirmButton message="Бүх ажилтанд утасны бүртгэлийг асаах уу?" className="btn-ghost px-3 py-1 text-xs">Бүгдийг чагтлах</ConfirmButton>
          </form>
          <form action={setAllRequireDevice}>
            <input type="hidden" name="value" value="off" />
            <ConfirmButton message="Бүх ажилтны утасны бүртгэлийг түр цуцлах уу?" className="btn-ghost px-3 py-1 text-xs">Бүгдийг түр цуцлах</ConfirmButton>
          </form>
          <form className="ml-auto flex gap-2">
            <input name="q" defaultValue={q} className="input py-1" placeholder="Нэр, кодоор хайх" />
            <button className="btn-ghost px-3 py-1 text-xs">Хайх</button>
          </form>
        </div>
        {pendingCount > 0 && <p className="font-semibold text-brand">📱 {pendingCount} батлах хүсэлт байна (дээд талд).</p>}
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="table">
          <thead>
            <tr><th>Ажилтан</th><th>Утасны бүртгэл</th><th>Холбогдсон утас</th></tr>
          </thead>
          <tbody>
            {emps.map((emp) => {
              const approved = devices.find((x) => x.employee_id === emp.id && x.status === "approved");
              const pending = devices.find((x) => x.employee_id === emp.id && x.status === "pending");
              return (
                <tr key={emp.id} className={emp.is_active ? "" : "opacity-40"}>
                  <td>
                    <div className="font-medium">{emp.full_name}</div>
                    <div className="text-xs text-gray-400">
                      {emp.emp_code}
                      {emp.department_id && ` · ${deptName.get(emp.department_id) ?? ""}`}
                      {emp.unit_id && ` · ${unitName.get(emp.unit_id) ?? ""}`}
                    </div>
                  </td>
                  <td>
                    <form action={setEmployeeRequireDevice}>
                      <input type="hidden" name="employee_id" value={emp.id} />
                      <AutoCheckbox name="value" checked={emp.require_device} label={emp.require_device ? "Идэвхтэй" : "Түр цуцалсан"} />
                    </form>
                  </td>
                  <td className="text-xs">
                    {pending ? (
                      <div className="flex flex-wrap items-center gap-1.5 rounded-lg bg-amber-50 px-2 py-1.5">
                        <span className="mr-1">🕒 <b>{pending.label ?? "Утас"}</b> хүсэлт · {fmtDateTime(pending.created_at)}</span>
                        <form action={approveDevice}>
                          <input type="hidden" name="id" value={pending.id} />
                          <button className="btn bg-emerald-600 px-2 py-1 text-xs text-white">Батлах</button>
                        </form>
                        <form action={removeDevice}>
                          <input type="hidden" name="id" value={pending.id} />
                          <button className="btn-ghost px-2 py-1 text-xs">Татгалзах</button>
                        </form>
                        {approved && <span className="w-full text-[11px] text-gray-500">Батлавал одоогийн «{approved.label}» утас солигдоно.</span>}
                      </div>
                    ) : approved ? (
                      <div className="flex items-center gap-3">
                        <span>
                          📱 <b>{approved.label ?? "Утас"}</b>
                          <span className="block text-gray-400">Сүүлд ашигласан: {approved.last_used_at ? fmtDateTime(approved.last_used_at) : "—"}</span>
                        </span>
                        <form action={removeDevice}>
                          <input type="hidden" name="id" value={approved.id} />
                          <ConfirmButton message={`${emp.full_name}-ийн утсыг салгах уу? Шинэ утсаа бүртгүүлэх хүртэл цаг бүртгүүлэх боломжгүй.`}>Салгах</ConfirmButton>
                        </form>
                      </div>
                    ) : (
                      <span className="text-gray-400">Холбогдоогүй{emp.require_device ? " — ажилтан апп-аасаа бүртгүүлнэ" : ""}</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {emps.length === 0 && <tr><td colSpan={3} className="py-6 text-center text-gray-400">Ажилтан олдсонгүй</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-500">
        Батлахаас өмнө тухайн ажилтан өөрөө, өөрийн утаснаас хүсэлт илгээснийг шалгаарай. Шинэ утсыг батлахад хуучин нь автоматаар цуцлагдана.
      </p>
    </div>
  );
}
