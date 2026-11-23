import Link from "next/link";
import { requirePerm } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ROLE_LABELS, type Employee } from "@/lib/types";
import { Icon } from "@/components/icons";
import { Modal } from "@/components/modal";
import { EmployeeForm } from "./employee-form";
import { loadOptions } from "./options";

export default async function EmployeesPage({ searchParams }: { searchParams: Promise<{ filter?: string; q?: string }> }) {
  const me = await requirePerm("attendance.employees", "/app");
  const { filter, q = "" } = await searchParams;
  const [{ data }, opts] = await Promise.all([
    createAdminClient().from("employees").select("*").eq("organization_id", me.organization_id).order("is_active", { ascending: false }).order("full_name"),
    loadOptions(me.organization_id),
  ]);
  const all = (data ?? []) as Employee[];
  const term = q.trim().toLowerCase();
  const emps = all.filter(
    (e) =>
      (filter !== "nodept" || (!e.department_id && e.is_active)) &&
      (!term || e.full_name.toLowerCase().includes(term) || e.phone.includes(term) || e.emp_code.toLowerCase().includes(term)),
  );
  const name = (list: { id: string; name: string }[], id: string | null) => list.find((x) => x.id === id)?.name ?? "—";
  const unitLabel = (id: string | null) => {
    const u = opts.units.find((x) => x.id === id);
    return u ? (u.is_station ? `⛽ ${u.name}` : u.name) : "—";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Ажилтан <span className="text-base font-normal text-gray-400">({all.filter((e) => e.is_active).length} идэвхтэй)</span></h1>
        <div className="flex flex-wrap items-center gap-2">
          <form className="flex gap-2">
            {filter && <input type="hidden" name="filter" value={filter} />}
            <input name="q" defaultValue={q} className="input py-1.5" placeholder="Нэр, утас, кодоор хайх" />
          </form>
          <Modal label={<><Icon name="plus" /> Ажилтан нэмэх</>} title="Шинэ ажилтан">
            <EmployeeForm {...opts} />
          </Modal>
        </div>
      </div>
      {filter === "nodept" && (
        <p className="flex items-center gap-2 text-sm">
          <span className="rounded-full bg-brand-soft px-3 py-1 text-brand">Алба хэлтэсгүй ажилтан: {emps.length}</span>
          <Link href="/app/employees" className="text-gray-500 underline">Шүүлтүүр арилгах</Link>
        </p>
      )}
      <p className="text-xs text-gray-500">
        Компани, алба хэлтэс, салбарыг <Link href="/admin/structure" className="text-brand underline">Алба хэлтэс</Link>, координатыг{" "}
        <Link href="/app/locations" className="text-brand underline">Байршил</Link> цэснээс нэмнэ.
      </p>
      <div>
        <div className="card overflow-x-auto p-0">
          <table className="table">
            <thead><tr><th>Нэр</th><th>Утас</th><th>Компани</th><th>Алба хэлтэс</th><th>Салбар</th><th>Координат</th><th>Хуваарь</th><th>Эрх</th><th></th></tr></thead>
            <tbody>
              {emps.map((e) => (
                <tr key={e.id} className={e.is_active ? "" : "opacity-40"}>
                  <td><div className="font-medium">{e.full_name}</div><div className="text-xs text-gray-400">{e.emp_code}{e.allow_trip && " · томилолт"}</div></td>
                  <td>{e.phone}</td>
                  <td className="text-xs">{name(opts.companies, e.company_id)}</td>
                  <td className="text-xs">{name(opts.departments, e.department_id)}</td>
                  <td className="text-xs">{unitLabel(e.unit_id)}</td>
                  <td className="text-xs">{name(opts.branches, e.branch_id)}</td>
                  <td className="text-xs">{name(opts.schedules, e.schedule_id)}</td>
                  <td className="text-xs">{ROLE_LABELS[e.role]}</td>
                  <td><Link className="text-sm text-brand" href={`/app/employees/${e.id}`}>Засах</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
