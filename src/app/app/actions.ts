"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentEmployee } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { supabaseUrl, supabaseAnonKey } from "@/lib/env";
import { distanceMeters } from "@/lib/geo";
import { zoned } from "@/lib/time";
import { lateMinutes, staleAfterMinutes, workedAndOvertime } from "@/lib/schedule";
import type { Branch, RequestType, Schedule } from "@/lib/types";
import { DEVICE_MESSAGES, deviceState, deviceTokenHash } from "@/lib/device";
import { deviceLabel } from "@/lib/device-detect";

export type PunchState = { ok: boolean; message: string } | null;

const MAX_ACCURACY_M = 150; // үүнээс муу нарийвчлалтай GPS-ийг хүлээн авахгүй

async function clientIp(): Promise<string | null> {
  const h = await headers();
  return (
    h.get("cf-connecting-ip") ??
    h.get("x-real-ip") ??
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    null
  );
}

function num(v: FormDataEntryValue | null): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Ирлээ / Явлаа товч. Цаг, байршлын шалгалтыг бүгдийг сервер хийнэ. */
export async function punch(_prev: PunchState, form: FormData): Promise<PunchState> {
  const emp = await getCurrentEmployee();
  const db = createAdminClient();

  // Зөвхөн админ баталсан, өөрийн утаснаас бүртгүүлнэ (өөр хүний эрхээр нэвтэрч дарахаас сэргийлнэ)
  const dev = await deviceState(emp);
  if (dev.kind !== "approved" && dev.kind !== "not_required") return { ok: false, message: DEVICE_MESSAGES[dev.kind] };
  if (dev.kind === "approved")
    await db.from("devices").update({ last_used_at: new Date().toISOString() }).eq("id", dev.device.id);

  const now = new Date(); // утасны биш, серверийн цаг
  const ip = await clientIp();
  const lat = num(form.get("lat"));
  const lng = num(form.get("lng"));
  const accuracy = num(form.get("accuracy"));
  const trip = form.get("mode") === "trip";
  const selfie = form.get("selfie");

  const [{ data: branches }, { data: schedule }, { data: open }] = await Promise.all([
    db.from("branches").select("*").eq("organization_id", emp.organization_id).eq("is_active", true),
    emp.schedule_id
      ? db.from("schedules").select("*").eq("id", emp.schedule_id).maybeSingle()
      : Promise.resolve({ data: null }),
    db.from("attendance_logs").select("*").eq("employee_id", emp.id).eq("status", "working").maybeSingle(),
  ]);
  const sched = schedule as Schedule | null;

  // Өмнөх ээлжид "Явлаа" дарахаа мартсан бол хаагаад шинээр ирц эхлүүлнэ
  let openLog = open;
  if (openLog) {
    const ageMin = (now.getTime() - new Date(openLog.check_in_at).getTime()) / 60000;
    if (ageMin > staleAfterMinutes(sched)) {
      await db
        .from("attendance_logs")
        .update({ status: "completed", note: "Явсан бүртгэлгүй (автоматаар хаасан)" })
        .eq("id", openLog.id);
      openLog = null;
    }
  }

  // ---------- Байршил шалгах ----------
  let branchId: string | null = null;
  let distance: number | null = null;
  let method: "GPS" | "WIFI" | "TRIP";
  let selfiePath: string | null = null;

  if (trip) {
    if (!emp.allow_trip) return { ok: false, message: "Танд томилолтын горимоор бүртгүүлэх эрх алга." };
    if (lat == null || lng == null) return { ok: false, message: "Байршлаа асааж зөвшөөрнө үү." };
    if (!(selfie instanceof File) || selfie.size === 0)
      return { ok: false, message: "Томилолтын үед сельфи зураг заавал шаардлагатай." };
    if (selfie.size > 4 * 1024 * 1024) return { ok: false, message: "Зураг хэт том байна." };
    // Хэрэглэгчийн зааснаар биш, файлын агуулгаар JPEG эсэхийг шалгана
    const head = new Uint8Array(await selfie.slice(0, 3).arrayBuffer());
    if (head[0] !== 0xff || head[1] !== 0xd8 || head[2] !== 0xff)
      return { ok: false, message: "Зургийн формат буруу байна." };
    selfiePath = `${emp.organization_id}/${emp.id}/${now.getTime()}.jpg`;
    const { error } = await db.storage
      .from("selfies")
      .upload(selfiePath, selfie, { contentType: "image/jpeg" });
    if (error) return { ok: false, message: "Зураг хадгалж чадсангүй. Дахин оролдоно уу." };
    method = "TRIP";
  } else {
    const all = (branches ?? []) as Branch[];
    // Салбар оноогдсон ажилтан зөвхөн өөрийн салбартаа бүртгүүлнэ. Оноогоогүй бол аль ч салбарт.
    const list = emp.branch_id ? all.filter((b) => b.id === emp.branch_id) : all;
    if (emp.branch_id && list.length === 0)
      return { ok: false, message: "Таны салбар идэвхгүй байна. Админд хандана уу." };
    const wifiBranch = ip ? list.find((b) => b.allowed_ips?.includes(ip)) : undefined;
    if (wifiBranch) {
      method = "WIFI";
      branchId = wifiBranch.id;
    } else {
      if (lat == null || lng == null)
        return { ok: false, message: "Байршил тодорхойлогдсонгүй. Утасныхаа байршлыг асаана уу." };
      if (accuracy != null && accuracy > MAX_ACCURACY_M)
        return { ok: false, message: `GPS нарийвчлал муу байна (${Math.round(accuracy)}м). Гадагш гарч дахин оролдоно уу.` };
      let best: { b: Branch; d: number } | null = null;
      for (const b of list) {
        const d = distanceMeters(lat, lng, Number(b.latitude), Number(b.longitude));
        if (!best || d < best.d) best = { b, d };
      }
      if (!best) return { ok: false, message: "Байршил тохируулагдаагүй байна. Админд хандана уу." };
      distance = best.d;
      const tolerance = Math.min(accuracy ?? 0, 30);
      if (best.d - tolerance > best.b.radius_meters)
        return {
          ok: false,
          message: emp.branch_id
            ? `Та өөрийн ажлын байр (${best.b.name})-аас ${best.d}м зайтай байна (зөвшөөрөх ${best.b.radius_meters}м).`
            : `Та ажлын байрнаас хол байна. Хамгийн ойр нь ${best.b.name}, ${best.d}м зайтай (зөвшөөрөх ${best.b.radius_meters}м).`,
        };
      method = "GPS";
      branchId = best.b.id;
    }
  }

  // ---------- Явлаа ----------
  if (openLog) {
    const { worked, overtime } = workedAndOvertime(sched, new Date(openLog.check_in_at), now);
    const { error } = await db
      .from("attendance_logs")
      .update({
        check_out_at: now.toISOString(),
        out_lat: lat,
        out_lng: lng,
        out_accuracy: accuracy == null ? null : Math.round(accuracy),
        out_distance: distance,
        out_ip: ip,
        out_selfie_path: selfiePath,
        worked_minutes: worked,
        overtime_minutes: overtime,
        status: "completed",
        ...(trip ? { review_status: "pending" } : {}),
      })
      .eq("id", openLog.id);
    if (error) return { ok: false, message: "Алдаа гарлаа. Дахин оролдоно уу." };
    revalidatePath("/app");
    return { ok: true, message: "Явсныг бүртгэлээ. Сайхан амраарай!" };
  }

  // ---------- Ирлээ ----------
  const workDate = zoned(now).date;
  // Хоцролтыг тухайн өдрийн зөвхөн эхний ирцэд тооцно
  const { count: earlier } = await db
    .from("attendance_logs")
    .select("id", { count: "exact", head: true })
    .eq("employee_id", emp.id)
    .eq("work_date", workDate);
  const late = earlier ? 0 : lateMinutes(sched, workDate, now);
  const { error } = await db.from("attendance_logs").insert({
    organization_id: emp.organization_id,
    employee_id: emp.id,
    branch_id: branchId,
    work_date: workDate,
    check_in_at: now.toISOString(),
    in_lat: lat,
    in_lng: lng,
    in_accuracy: accuracy == null ? null : Math.round(accuracy),
    in_distance: distance,
    in_ip: ip,
    verify_method: method,
    in_selfie_path: selfiePath,
    late_minutes: late,
    review_status: trip ? "pending" : "auto",
  });
  if (error) return { ok: false, message: "Алдаа гарлаа. Дахин оролдоно уу." };
  revalidatePath("/app");
  return {
    ok: true,
    message: late > 0 ? `Ирснийг бүртгэлээ. ${late} минут хоцорсон байна.` : "Ирснийг бүртгэлээ. Амжилт!",
  };
}

export type FormState = { ok: boolean; message: string } | null;

const REQUEST_TYPES: RequestType[] = ["paid_leave", "unpaid_leave", "sick_leave", "overtime", "outside_work", "forgot_checkin"];

export async function submitRequest(_prev: FormState, form: FormData): Promise<FormState> {
  const emp = await getCurrentEmployee();
  const type = String(form.get("type")) as RequestType;
  const start = String(form.get("start_at") ?? "");
  const end = String(form.get("end_at") ?? "");
  const reason = String(form.get("reason") ?? "").trim();
  if (!REQUEST_TYPES.includes(type)) return { ok: false, message: "Хүсэлтийн төрлөө сонгоно уу." };
  if (!start || !end || !reason) return { ok: false, message: "Бүх талбарыг бөглөнө үү." };
  if (reason.length > 1000) return { ok: false, message: "Шалтгаан хэт урт байна (1000 тэмдэгтээс ихгүй)." };
  // datetime-local утга нь УБ цагаар
  const startAt = new Date(`${start}:00+08:00`);
  const endAt = new Date(`${end}:00+08:00`);
  if (!(endAt > startAt)) return { ok: false, message: "Дуусах цаг эхлэхээс хойш байх ёстой." };
  const hours = Math.round(((endAt.getTime() - startAt.getTime()) / 3600000) * 100) / 100;
  const { error } = await createAdminClient().from("requests").insert({
    organization_id: emp.organization_id,
    employee_id: emp.id,
    type,
    start_at: startAt.toISOString(),
    end_at: endAt.toISOString(),
    total_hours: hours,
    reason,
  });
  if (error) return { ok: false, message: "Хүсэлт илгээж чадсангүй." };
  revalidatePath("/app/requests");
  return { ok: true, message: "Хүсэлт илгээгдлээ." };
}

export async function changePassword(_prev: FormState, form: FormData): Promise<FormState> {
  await getCurrentEmployee();
  const current = String(form.get("current_password") ?? "");
  const pw = String(form.get("password") ?? "");
  if (!current) return { ok: false, message: "Одоогийн нууц үгээ оруулна уу." };
  if (pw.length < 8) return { ok: false, message: "Нууц үг хамгийн багадаа 8 тэмдэгт." };
  if (pw !== String(form.get("password2") ?? "")) return { ok: false, message: "Нууц үг таарахгүй байна." };
  if (pw === current) return { ok: false, message: "Шинэ нууц үг хуучнаасаа өөр байх ёстой." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { ok: false, message: "Дахин нэвтэрнэ үү." };
  // Одоогийн нууц үгийг тусдаа (cookie-гүй) клиентээр шалгана, одоогийн нэвтрэлтэд нөлөөлөхгүй
  const verifier = createSupabaseClient(supabaseUrl(), supabaseAnonKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: verifyErr } = await verifier.auth.signInWithPassword({ email: user.email, password: current });
  if (verifyErr) return { ok: false, message: "Одоогийн нууц үг буруу байна." };
  await verifier.auth.signOut({ scope: "local" });

  const { error } = await supabase.auth.updateUser({ password: pw });
  if (error) return { ok: false, message: "Нууц үг солиход алдаа гарлаа." };
  return { ok: true, message: "Нууц үг солигдлоо." };
}

/** Энэ утсыг ажилтанд бүртгүүлэх хүсэлт (админ батална) */
export async function registerDevice(): Promise<FormState> {
  const emp = await getCurrentEmployee();
  const db = createAdminClient();
  const hash = await deviceTokenHash(true);
  if (!hash) return { ok: false, message: "Утсыг таньж чадсангүй." };
  const { data: existing } = await db.from("devices").select("employee_id, status").eq("token_hash", hash).maybeSingle();
  if (existing) {
    if (existing.employee_id !== emp.id) return { ok: false, message: DEVICE_MESSAGES.other_employee };
    return { ok: true, message: existing.status === "approved" ? "Энэ утас аль хэдийн батлагдсан." : DEVICE_MESSAGES.pending };
  }
  // Өмнөх батлагдаагүй хүсэлтийг шинээр солино
  await db.from("devices").delete().eq("employee_id", emp.id).eq("status", "pending");
  const ua = (await headers()).get("user-agent") ?? "";
  const { error } = await db.from("devices").insert({
    organization_id: emp.organization_id,
    employee_id: emp.id,
    token_hash: hash,
    label: deviceLabel(ua),
  });
  if (error) return { ok: false, message: "Хүсэлт илгээж чадсангүй. Дахин оролдоно уу." };
  revalidatePath("/app");
  return { ok: true, message: "Хүсэлт илгээгдлээ. Админ батласны дараа цаг бүртгүүлэх боломжтой." };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
