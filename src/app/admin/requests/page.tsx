import { requireStaffAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { fmtDateTime } from "@/lib/time";
import { REQUEST_LABELS, STATUS_LABELS, type RequestType } from "@/lib/types";
import { reviewRequest } from "../actions";

const fmt = fmtDateTime;

export default async function AdminRequests({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const me = await requireStaffAdmin();
  const { status = "pending" } = await searchParams;
  let q = createAdminClient()
    .from("requests")
    .select("*, employee:employees!requests_employee_id_fkey(full_name, emp_code)")
    .eq("organization_id", me.organization_id)
    .order("created_at", { ascending: false })
    .limit(100);
  if (status !== "all") q = q.eq("status", status);
  const { data } = await q;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Хүсэлт батлах</h1>
      <div className="flex gap-2 text-sm">
        {["pending", "approved", "rejected", "all"].map((s) => (
          <a key={s} href={`?status=${s}`} className={`rounded-full px-3 py-1 ${s === status ? "bg-brand text-white" : "bg-white ring-1 ring-gray-200"}`}>
            {s === "all" ? "Бүгд" : STATUS_LABELS[s]}
          </a>
        ))}
      </div>
      <div className="space-y-3">
        {(data ?? []).map((r) => (
          <div key={r.id} className="card flex flex-wrap items-start justify-between gap-4">
            <div className="text-sm">
              <p className="font-semibold">{r.employee?.full_name} <span className="font-normal text-gray-400">{r.employee?.emp_code}</span></p>
              <p><span className="rounded bg-gray-100 px-1.5 text-xs">{REQUEST_LABELS[r.type as RequestType]}</span> {fmt(r.start_at)} – {fmt(r.end_at)} · <b>{r.total_hours} цаг</b></p>
              <p className="mt-1 text-gray-600">{r.reason}</p>
              {r.review_note && <p className="text-xs text-gray-500">Тайлбар: {r.review_note}</p>}
            </div>
            {r.status === "pending" ? (
              <form action={reviewRequest} className="flex flex-wrap items-center gap-2">
                <input type="hidden" name="id" value={r.id} />
                <input name="review_note" className="input w-48" placeholder="Тайлбар (заавал биш)" />
                <button name="decision" value="approved" className="btn bg-emerald-600 text-white hover:bg-emerald-700">Батлах</button>
                <button name="decision" value="rejected" className="btn-ghost">Татгалзах</button>
              </form>
            ) : (
              <span className="text-sm text-gray-500">{STATUS_LABELS[r.status]}</span>
            )}
          </div>
        ))}
        {(data ?? []).length === 0 && <p className="card text-center text-sm text-gray-400">Хүсэлт алга</p>}
      </div>
    </div>
  );
}
