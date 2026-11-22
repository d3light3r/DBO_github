"use server";

import { revalidatePath } from "next/cache";
import { DEVICE_MESSAGES, deviceState } from "@/lib/device";
import { can } from "@/lib/permissions";
import { stationContext } from "@/lib/station-access";
import { describeRanges, parseTalonForm, talonDbError } from "@/lib/talon";
import { talonRpc } from "@/lib/talon-db";
import { createAdminClient } from "@/lib/supabase/admin";
import { MAX_REDEEM_IMPORT, parseRedeemPaste } from "@/lib/talon-redeem-import";
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
  if (!can(emp, "station.talon.redeem")) return { ok: false, message: "Талон бүртгэх эрхгүй байна." };
  const dev = await deviceState(emp);
  if (dev.kind !== "approved" && dev.kind !== "not_required") return { ok: false, message: DEVICE_MESSAGES[dev.kind] };

  const parsed = parseTalonForm((k) => String(f.get(k) ?? ""));
  if ("error" in parsed) return { ok: false, message: parsed.error };
  const raw = String(f.get("date") ?? "");
  const date = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : todayUB();

  const { data, error } = await talonRpc("redeem", parsed.ranges, {
    p_org: emp.organization_id,
    p_branch: stationId,
    p_by: emp.id,
    p_date: date,
  });
  if (error) return { ok: false, message: talonDbError(error) };
  revalidatePath(`/station/${stationId}`, "layout");
  revalidatePath("/talon", "layout");
  return {
    ok: true,
    message: `${data} талон оруулагдлаа: ${describeRanges(parsed.ranges)}`,
  };
}

/**
 * ШТС-д ашигласан талоныг Excel-ээс импортлох («ШТС талон импорт» эрхтэй ажилтан).
 * Огнооны хязгаар үйлчлэхгүй; зараагүй, өмнө оруулсан, ирээдүйн, зарсан огнооноос өмнөх бол бүгд буцна.
 */
export async function importRedeemTalons(_p: RedeemState, f: FormData): Promise<RedeemState> {
  const { emp, stations } = await stationContext();
  const stationId = String(f.get("station_id") ?? "");
  if (!stations.some((x) => x.id === stationId)) return { ok: false, message: "Энэ ШТС-д хандах эрхгүй байна." };
  const dev = await deviceState(emp);
  if (dev.kind !== "approved" && dev.kind !== "not_required") return { ok: false, message: DEVICE_MESSAGES[dev.kind] };

  const db = createAdminClient();
  if (!can(emp, "station.talon.import")) return { ok: false, message: "Талон импортлох эрхгүй байна." };

  const { rows, errors, duplicates, removed } = parseRedeemPaste(String(f.get("data") ?? ""));
  if (errors.length) return { ok: false, message: `Алдаатай ${errors.length} мөр байна (${errors.slice(0, 5).map((e) => `${e.line}-р мөр`).join(", ")}). Засаад дахин буулгана уу.` };
  if (duplicates.length) return { ok: false, message: `Нэг сериал өөр огноотой давхар орсон ${duplicates.length} мөр байна (${duplicates.slice(0, 5).map((d) => `${d.line}-р мөр ${d.serial}`).join(", ")}).` };
  if (!rows.length) return { ok: false, message: "Импортлох мөр алга." };
  if (rows.length > MAX_REDEEM_IMPORT) return { ok: false, message: `Нэг удаад ${MAX_REDEEM_IMPORT} хүртэл талон импортлоно.` };
  const raw = String(f.get("date") ?? "");
  const fallback = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : todayUB();

  const { data, error } = await db.rpc("talon_redeem_import", {
    p_org: emp.organization_id,
    p_branch: stationId,
    p_by: emp.id,
    p_serials: rows.map((r) => r.serial),
    p_dates: rows.map((r) => r.date ?? fallback),
  });
  if (error) return { ok: false, message: talonDbError(error) };
  revalidatePath(`/station/${stationId}`, "layout");
  revalidatePath("/talon", "layout");
  const total = rows.reduce((t, r) => t + r.amount, 0);
  return {
    ok: true,
    message: `${data} талон оруулагдлаа, нийт ${new Intl.NumberFormat("en-US").format(total)}₮.${removed.length ? ` ${removed.length} яг ижил давхар мөрийг хассан.` : ""}`,
  };
}
