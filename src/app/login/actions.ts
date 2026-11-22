"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { phoneToEmail } from "@/lib/phone";

export async function login(_prev: string | null, form: FormData): Promise<string | null> {
  const phone = String(form.get("phone") ?? "");
  const password = String(form.get("password") ?? "");
  if (!phone || !password) return "Утасны дугаар, нууц үгээ оруулна уу.";
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email: phoneToEmail(phone), password });
  if (error || !data.user) return "Утасны дугаар эсвэл нууц үг буруу байна.";
  const { data: emp } = await createAdminClient()
    .from("employees")
    .select("role, is_active")
    .eq("user_id", data.user.id)
    .maybeSingle();
  if (!emp?.is_active) {
    await supabase.auth.signOut();
    return "Таны эрх идэвхгүй байна. Админд хандана уу.";
  }
  redirect("/app"); // Цаг бүртгэл апп (эрхгүй бол эхний эрхтэй хуудас руу шилжинэ)
}
