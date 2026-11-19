import { reviewRequest } from "@/app/review-actions";
import { fmtDateTime } from "@/lib/time";
import { REQUEST_LABELS, STATUS_LABELS, type RequestType } from "@/lib/types";

export type RequestRow = {
  id: string;
  type: string;
  start_at: string;
  end_at: string;
  total_hours: number;
  reason: string;
  status: string;
  review_note: string | null;
  employee: { full_name: string; emp_code: string } | null;
};

/** Батлах хүсэлтийн карт (удирдлага болон ажилтны апп-д) */
export function RequestCard({ r, compact = false }: { r: RequestRow; compact?: boolean }) {
  return (
    <div className={`card flex flex-wrap items-start justify-between gap-3 ${compact ? "p-3" : ""}`}>
      <div className="min-w-0 text-sm">
        <p className="font-semibold">
          {r.employee?.full_name} <span className="font-normal text-gray-400">{r.employee?.emp_code}</span>
        </p>
        <p>
          <span className="rounded bg-gray-100 px-1.5 text-xs">{REQUEST_LABELS[r.type as RequestType]}</span>{" "}
          <span className="text-xs text-gray-600">{fmtDateTime(r.start_at)} – {fmtDateTime(r.end_at)}</span> · <b>{r.total_hours} цаг</b>
        </p>
        <p className="mt-1 text-gray-700">📝 {r.reason}</p>
        {r.review_note && <p className="text-xs text-gray-500">Хариу: {r.review_note}</p>}
      </div>
      {r.status === "pending" ? (
        <form action={reviewRequest} className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <input type="hidden" name="id" value={r.id} />
          <input name="review_note" className="input flex-1 sm:w-44" placeholder="Хариу (заавал биш)" />
          <button name="decision" value="approved" className="btn bg-emerald-600 text-white hover:bg-emerald-700">Батлах</button>
          <button name="decision" value="rejected" className="btn-ghost">Татгалзах</button>
        </form>
      ) : (
        <span className="text-sm text-gray-500">{STATUS_LABELS[r.status]}</span>
      )}
    </div>
  );
}
