import { requirePerm } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { reviewableEmployeeIds } from "@/lib/approvals";
import { STATUS_LABELS } from "@/lib/types";
import { RequestCard, type RequestRow } from "@/components/request-card";

export default async function AdminRequests({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const me = await requirePerm("attendance.approvals", "/app");
  const { status = "pending" } = await searchParams;
  const allowed = await reviewableEmployeeIds(me);
  let q = createAdminClient()
    .from("requests")
    .select("*, employee:employees!requests_employee_id_fkey(full_name, emp_code)")
    .eq("organization_id", me.organization_id)
    .order("created_at", { ascending: false })
    .limit(100);
  if (status !== "all") q = q.eq("status", status);
  // Админ бүгдийг, бусад нь зөвхөн өөрийн батлах алба хэлтсийн хүсэлтийг харна
  if (allowed !== null) q = q.in("employee_id", allowed.length ? allowed : ["00000000-0000-0000-0000-000000000000"]);
  const { data } = await q;
  const rows = (data ?? []) as RequestRow[];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Цагийн хүсэлт</h1>
      {allowed !== null && (
        <p className="text-sm text-gray-500">Таныг батлагчаар томилсон алба хэлтсийн ажилтнуудын хүсэлт харагдана.</p>
      )}
      <div className="flex gap-2 text-sm">
        {["pending", "approved", "rejected", "all"].map((s) => (
          <a key={s} href={`?status=${s}`} className={`rounded-full px-3 py-1 ${s === status ? "bg-brand text-white" : "bg-white ring-1 ring-gray-200"}`}>
            {s === "all" ? "Бүгд" : STATUS_LABELS[s]}
          </a>
        ))}
      </div>
      <div className="space-y-3">
        {rows.map((r) => <RequestCard key={r.id} r={r} />)}
        {rows.length === 0 && <p className="card text-center text-sm text-gray-400">Хүсэлт алга</p>}
      </div>
    </div>
  );
}
