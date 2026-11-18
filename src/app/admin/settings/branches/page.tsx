import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Branch } from "@/lib/types";
import { ConfirmButton } from "@/components/confirm-button";
import { deleteBranch } from "../../actions";
import { BranchForm } from "./branch-form";

export default async function BranchesPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const me = await requireAdmin();
  const { edit } = await searchParams;
  const { data } = await createAdminClient().from("branches").select("*").eq("organization_id", me.organization_id).order("name");
  const branches = (data ?? []) as Branch[];
  const editing = branches.find((b) => b.id === edit);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="card overflow-x-auto p-0">
          <table className="table">
            <thead><tr><th>Нэр</th><th>Байршил</th><th>Радиус</th><th>Wi-Fi IP</th><th></th></tr></thead>
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
                  <td>
                    <div className="flex items-center gap-3">
                      <a href={`?edit=${b.id}`} className="text-sm text-brand">Засах</a>
                      <form action={deleteBranch}>
                        <input type="hidden" name="id" value={b.id} />
                        <ConfirmButton message={`«${b.name}» салбарыг устгах уу? Энэ салбарт оноогдсон ажилтнуудын салбар хоосон болно.`}>Устгах</ConfirmButton>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
              {branches.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-gray-400">Салбар нэмээгүй байна</td></tr>}
            </tbody>
          </table>
        </div>
        <BranchForm key={editing?.id ?? "new"} branch={editing} />
      </div>
    </div>
  );
}
