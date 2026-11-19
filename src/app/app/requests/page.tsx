import { getCurrentEmployee } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { fmtDateTime } from "@/lib/time";
import { REQUEST_LABELS, STATUS_LABELS, type RequestType } from "@/lib/types";
import { RequestForm } from "./request-form";
import { approverNameFor, reviewableEmployeeIds } from "@/lib/approvals";
import { RequestCard, type RequestRow } from "@/components/request-card";

export default async function RequestsPage() {
  const emp = await getCurrentEmployee();
  const db = createAdminClient();
  const [{ data }, approver, allowed] = await Promise.all([
    db.from("requests").select("*").eq("employee_id", emp.id).order("created_at", { ascending: false }).limit(30),
    approverNameFor(emp),
    // Админ удирдлагын хэсгээс батална; энд зөвхөн алба хэлтсийн батлагчид харагдана
    emp.role === "admin" ? Promise.resolve([] as string[]) : reviewableEmployeeIds(emp),
  ]);
  const ids = allowed ?? [];
  const { data: toReview } = ids.length
    ? await db
        .from("requests")
        .select("*, employee:employees!requests_employee_id_fkey(full_name, emp_code)")
        .in("employee_id", ids)
        .eq("status", "pending")
        .order("created_at")
    : { data: [] };
  const reviewRows = (toReview ?? []) as RequestRow[];

  return (
    <>
      {reviewRows.length > 0 && (
        <section className="space-y-2">
          <h2 className="px-1 text-sm font-semibold">✅ Батлах хүсэлт ({reviewRows.length})</h2>
          {reviewRows.map((r) => <RequestCard key={r.id} r={r} compact />)}
        </section>
      )}
      <RequestForm />
      <p className="-mt-2 px-1 text-xs text-gray-500">
        Таны хүсэлтийг батлах: <b>{approver ?? "Админ"}</b>
      </p>
      <section className="card">
        <h2 className="mb-2 text-sm font-semibold">Миний хүсэлтүүд</h2>
        {(data ?? []).length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-400">Хүсэлт алга</p>
        ) : (
          <ul className="divide-y divide-gray-100 text-sm">
            {data!.map((r) => (
              <li key={r.id} className="py-2">
                <div className="flex justify-between">
                  <span className="font-medium">{REQUEST_LABELS[r.type as RequestType]}</span>
                  <StatusBadge status={r.status} />
                </div>
                <p className="text-xs text-gray-500">
                  {fmtDateTime(r.start_at)} – {fmtDateTime(r.end_at)} ({r.total_hours} цаг)
                </p>
                <p className="text-xs text-gray-600">{r.reason}</p>
                {r.review_note && <p className="text-xs text-gray-500">Хариу: {r.review_note}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "approved" ? "bg-emerald-100 text-emerald-700" : status === "rejected" ? "bg-red-100 text-brand" : "bg-amber-100 text-amber-800";
  return <span className={`rounded-full px-2 py-0.5 text-xs ${cls}`}>{STATUS_LABELS[status]}</span>;
}
