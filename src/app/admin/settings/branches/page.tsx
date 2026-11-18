import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Branch } from "@/lib/types";
import { ConfirmButton } from "@/components/confirm-button";
import { deleteBranch } from "../../actions";
import { Icon } from "@/components/icons";
import { Modal } from "@/components/modal";
import { BranchForm } from "./branch-form";

export default async function BranchesPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const me = await requireAdmin();
  const { edit } = await searchParams;
  const db = createAdminClient();
  const [{ data }, { data: emps }] = await Promise.all([
    db.from("branches").select("*").eq("organization_id", me.organization_id).order("name"),
    db.from("employees").select("branch_id").eq("organization_id", me.organization_id).eq("is_active", true),
  ]);
  const count = (id: string) => (emps ?? []).filter((e) => e.branch_id === id).length;
  const branches = (data ?? []) as Branch[];
  const editing = branches.find((b) => b.id === edit);

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">
        <b>Координат</b> = ажилтан «Ирлээ» дарах цэг (газрын зургийн байршил + радиус). Ажилтан бүрт координатыг{" "}
        <Link href="/admin/employees" className="text-brand underline">Ажилтан</Link> хэсгээс сонгоно. ШТС-ийн байршлыг ч энд нэмнэ (жнь «ШТС-1 байршил»).
      </p>
      <div className="flex justify-end">
        <Modal label={<><Icon name="plus" /> Координат нэмэх</>} title="Шинэ координат">
          <BranchForm key="new" />
        </Modal>
        {editing && (
            <Modal label="" title={`Координат засах: ${editing.name}`} defaultOpen closeHref="?" buttonClassName="hidden">
              <BranchForm key={editing.id} branch={editing} />
            </Modal>
        )}
      </div>
      <div>
        <div className="card overflow-x-auto p-0">
          <table className="table">
            <thead><tr><th>Нэр</th><th>Байршил</th><th>Радиус</th><th>Wi-Fi IP</th><th>Ажилтан</th><th></th></tr></thead>
            <tbody>
              {branches.map((b) => (
                <tr key={b.id} className={b.is_active ? "" : "opacity-50"}>
                  <td className="font-medium">{b.name}</td>
                  <td className="text-xs">
                    <a className="text-brand underline" target="_blank" rel="noreferrer"
                      href={`https://www.openstreetmap.org/?mlat=${b.latitude}&mlon=${b.longitude}#map=18/${b.latitude}/${b.longitude}`}>
                      {Number(b.latitude).toFixed(5)}, {Number(b.longitude).toFixed(5)}
                    </a>
                  </td>
                  <td>{b.radius_meters}м</td>
                  <td className="text-xs">{b.allowed_ips.length ? b.allowed_ips.join(", ") : <span className="text-gray-400">Зөвхөн GPS</span>}</td>
                  <td className="whitespace-nowrap">👥 {count(b.id)}</td>
                  <td>
                    <div className="flex items-center gap-3">
                      <a href={`?edit=${b.id}`} className="text-sm text-brand">Засах</a>
                      <form action={deleteBranch}>
                        <input type="hidden" name="id" value={b.id} />
                        <ConfirmButton message={`«${b.name}» координатыг устгах уу? Энэ координаттай ажилтнуудын координат хоосон болно.`}>Устгах</ConfirmButton>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
              {branches.length === 0 && <tr><td colSpan={6} className="py-6 text-center text-gray-400">Координат нэмээгүй байна</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
