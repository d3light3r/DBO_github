"use server";

import { revalidatePath } from "next/cache";
import { getCurrentEmployee } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { reviewableEmployeeIds } from "@/lib/approvals";

/** Хүсэлт батлах / татгалзах (админ эсвэл тухайн алба хэлтсийн батлагч) */
export async function reviewRequest(f: FormData) {
  const me = await getCurrentEmployee();
  const id = String(f.get("id") ?? "");
  const decision = f.get("decision") === "approved" ? "approved" : "rejected";
  const db = createAdminClient();
  const { data: req } = await db.from("requests").select("employee_id").eq("id", id).eq("organization_id", me.organization_id).maybeSingle();
  if (!req || req.employee_id === me.id) return; // өөрийнхөө хүсэлтийг өөрөө батлахгүй
  const allowed = await reviewableEmployeeIds(me);
  if (allowed !== null && !allowed.includes(req.employee_id)) return;
  await db
    .from("requests")
    .update({
      status: decision,
      reviewed_by: me.id,
      reviewed_at: new Date().toISOString(),
      review_note: String(f.get("review_note") ?? "").trim().slice(0, 1000) || null,
    })
    .eq("id", id)
    .eq("status", "pending");
  revalidatePath("/admin/requests");
  revalidatePath("/admin");
  revalidatePath("/app/requests");
}
