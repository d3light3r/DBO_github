"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEVICE_MESSAGES, deviceState } from "@/lib/device";
import { stationContext } from "@/lib/station-access";
import { fmtMoney, parseRange, talonDbError } from "@/lib/talon";
import { todayUB } from "@/lib/time";

export type RedeemState = { ok: boolean; message: string } | null;

/**
 * Станцын ажилтан талон оруулна (харилцагч талоноор бүтээгдэхүүн авсан).
 * Ажилтан, салбарыг нэвтэрсэн хэрэглэгчээс таньна. Огнооны хязгаар, зарагдсан эсэх,
 * давхардлыг өгөгдлийн сангийн функц нэг гүйлгээнд шалгана.
 */
export async function redeemTalons(_p: RedeemState, f: FormData): Promise<RedeemState> {
  const { emp, stations } = await stationContext();
  const stationId = String(f.get("station_id") ?? "");
  if (!stations.some((x) => x.id === stationId)) return { ok: false, message: "Энэ ШТС-д хандах эрхгүй байна." };
  const dev = await deviceState(emp);
  if (dev.kind !== "approved" && dev.kind !== "not_required") return { ok: false, message: DEVICE_MESSAGES[dev.kind] };

  const range = parseRange(String(f.get("from") ?? ""), String(f.get("to") ?? ""));
  if ("error" in range) return { ok: false, message: range.error };
  const raw = String(f.get("date") ?? "");
  const date = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : todayUB();

  const { data, error } = await createAdminClient().rpc("talon_redeem", {
    p_org: emp.organization_id,
    p_from: range.from,
    p_to: range.to,
    p_branch: stationId,
    p_by: emp.id,
    p_date: date,
  });
  if (error) return { ok: false, message: talonDbError(error) };
  revalidatePath(`/station/${stationId}`, "layout");
  revalidatePath("/admin/talons");
  return {
    ok: true,
    message: `${data} ширхэг ${fmtMoney(range.amount)}-ийн талон оруулагдлаа (${range.from}${range.count > 1 ? ` – ${range.to}` : ""}). Нийт ${fmtMoney(range.total)}.`,
  };
}
