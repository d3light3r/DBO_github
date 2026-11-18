import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ROLE_LABELS, type Employee } from "@/lib/types";
import { EmployeeForm } from "./employee-form";
import { loadOptions } from "./options";

export default async function EmployeesPage() {
  const me = await requireAdmin();
  const [{ data }, opts] = await Promise.all([
    createAdminClient().from("employees").select("*").eq("organization_id", me.organization_id).order("is_active", { ascending: false }).order("full_name"),
    loadOptions(me.organization_id),
  ]);
  const emps = (data ?? []) as Employee[];
  const name = (list: { id: string; name: string }[], id: string | null) => list.find((x) => x.id === id)?.name ?? "—";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Ажилтан <span className="text-base font-normal text-gray-400">({emps.filter((e) => e.is_active).length} идэвхтэй)</span></h1>
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="card overflow-x-auto p-0">
          <table className="table">
            <thead><tr><th>Нэр</th><th>Утас</th><th>Хэлтэс</th><th>Салбар</th><th>Хуваарь</th><th>Эрх</th><th></th></tr></thead>
            <tbody>
              {emps.map((e) => (
                <tr key={e.id} className={e.is_active ? "" : "opacity-40"}>
                  <td><div className="font-medium">{e.full_name}</div><div className="text-xs text-gray-400">{e.emp_code}{e.allow_trip && " · томилолт"}</div></td>
                  <td>{e.phone}</td>
                  <td className="text-xs">{name(opts.departments, e.department_id)}</td>
                  <td className="text-xs">{name(opts.branches, e.branch_id)}</td>
                  <td className="text-xs">{name(opts.schedules, e.schedule_id)}</td>
                  <td className="text-xs">{ROLE_LABELS[e.role]}</td>
                  <td><Link className="text-sm text-brand" href={`/admin/employees/${e.id}`}>Засах</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="space-y-6">
          <EmployeeForm {...opts} />
          <p className="text-xs text-gray-500">
            Хэлтэс, салбар, хуваарийг <Link href="/admin/settings/departments" className="text-brand underline">Тохиргоо</Link> хэсгээс нэмнэ.
          </p>
        </div>
      </div>
    </div>
  );
}
