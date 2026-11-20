import "server-only";
import { createAdminClient } from "./supabase/admin";
import type { TalonRange } from "./talon";

type Op = "sell" | "redeem" | "undo";

/**
 * Талоны мужуудыг өгөгдлийн санд бичнэ. Ганц мөр бол 0006-ийн функц,
 * олон мөр бол 0007-ийн *_multi функц (нэг гүйлгээнд — бүгд эсвэл юу ч биш).
 */
export async function talonRpc(op: Op, ranges: TalonRange[], args: Record<string, unknown>) {
  const db = createAdminClient();
  if (ranges.length === 1) {
    return db.rpc(`talon_${op}`, { ...args, p_from: ranges[0].from, p_to: ranges[0].to });
  }
  const res = await db.rpc(`talon_${op}_multi`, { ...args, p_from: ranges.map((r) => r.from), p_to: ranges.map((r) => r.to) });
  if (res.error && /talon_\w+_multi/.test(res.error.message) && /function|schema cache/i.test(res.error.message)) {
    return { ...res, error: { ...res.error, message: "Олон төрлийг нэг дор бүртгэхийн тулд Supabase дээр 0007_talon_multi.sql-ийг ажиллуулна уу. Одоохондоо төрөл тус бүрээр тусад нь бүртгэнэ үү.", details: null } };
  }
  return res;
}
