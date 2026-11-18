import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ConfirmButton } from "@/components/confirm-button";
import { addDepartment, deleteDepartment, renameDepartment } from "../../actions";

export default async function DepartmentsPage() {
  const me = await requireAdmin();
  const db = createAdminClient();
  const [{ data: depts }, { data: emps }] = await Promise.all([
    db.from("departments").select("id, name").eq("organization_id", me.organization_id).order("name"),
    db.from("employees").select("department_id").eq("organization_id", me.organization_id).eq("is_active", true),
  ]);
  const count = (id: string) => (emps ?? []).filter((e) => e.department_id === id).length;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <section className="card overflow-x-auto p-0">
        <table className="table">
          <thead><tr><th>Хэлтэс</th><th>Ажилтан</th><th></th></tr></thead>
          <tbody>
            {(depts ?? []).map((d) => (
              <tr key={d.id}>
                <td>
                  <form action={renameDepartment} className="flex gap-2">
                    <input type="hidden" name="id" value={d.id} />
                    <input name="name" defaultValue={d.name} className="input py-1" required />
                    <button className="btn-ghost px-2 py-1 text-xs">Хадгалах</button>
                  </form>
                </td>
                <td className="whitespace-nowrap">{count(d.id)}</td>
                <td>
                  <form action={deleteDepartment}>
                    <input type="hidden" name="id" value={d.id} />
                    <ConfirmButton message={`«${d.name}» хэлтсийг устгах уу? ${count(d.id)} ажилтны хэлтэс хоосон болно.`}>Устгах</ConfirmButton>
                  </form>
                </td>
              </tr>
            ))}
            {(depts ?? []).length === 0 && <tr><td colSpan={3} className="py-6 text-center text-gray-400">Хэлтэс нэмээгүй байна</td></tr>}
          </tbody>
        </table>
      </section>
      <form action={addDepartment} className="card h-fit space-y-3">
        <h2 className="font-semibold">Шинэ хэлтэс</h2>
        <input name="name" className="input" placeholder="СЗА, ҮАА, Борлуулалт..." required />
        <button className="btn-primary w-full">Нэмэх</button>
      </form>
    </div>
  );
}
