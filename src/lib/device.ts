import "server-only";
import { cookies } from "next/headers";
import { createAdminClient } from "./supabase/admin";
import type { Device, Employee } from "./types";

/** Утсыг таних түлхүүр хадгалах cookie (JavaScript уншиж чадахгүй) */
export const DEVICE_COOKIE = "dbo_device";
const MAX_AGE = 400 * 24 * 3600; // хөтчүүдийн зөвшөөрөх дээд хугацаа

export async function hashToken(token: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

function newToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Энэ хөтчийн түлхүүр. create=true бол байхгүй үед шинээр үүсгэж cookie-д хадгална (зөвхөн server action-д). */
export async function deviceTokenHash(create = false): Promise<string | null> {
  const store = await cookies();
  let token = store.get(DEVICE_COOKIE)?.value;
  if (!token || !/^[0-9a-f]{64}$/.test(token)) {
    if (!create) return null;
    token = newToken();
    store.set(DEVICE_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: MAX_AGE,
    });
  }
  return hashToken(token);
}

export type DeviceState =
  | { kind: "not_required" }
  | { kind: "approved"; device: Device }
  | { kind: "pending"; device: Device }
  | { kind: "other_employee" }
  | { kind: "unregistered" };

/** Энэ утас тухайн ажилтанд бүртгэлтэй, батлагдсан эсэх */
export async function deviceState(emp: Pick<Employee, "id" | "require_device">): Promise<DeviceState> {
  // Утас шаардах эсэхийг ажилтан бүр дээр тохируулна
  if (!emp.require_device) return { kind: "not_required" };
  const db = createAdminClient();
  const hash = await deviceTokenHash();
  if (!hash) return { kind: "unregistered" };
  const { data } = await db.from("devices").select("*").eq("token_hash", hash).maybeSingle();
  const device = data as Device | null;
  if (!device) return { kind: "unregistered" };
  if (device.employee_id !== emp.id) return { kind: "other_employee" };
  return device.status === "approved" ? { kind: "approved", device } : { kind: "pending", device };
}

export const DEVICE_MESSAGES: Record<Exclude<DeviceState["kind"], "approved" | "not_required">, string> = {
  unregistered: "Энэ утас бүртгэлгүй байна. «Энэ утсыг бүртгүүлэх» товчийг дарж админаар батлуулна уу.",
  pending: "Энэ утасны бүртгэлийг админ батлахыг хүлээж байна.",
  other_employee: "Энэ утас өөр ажилтанд бүртгэлтэй тул таны нэрээр цаг бүртгэх боломжгүй.",
};
