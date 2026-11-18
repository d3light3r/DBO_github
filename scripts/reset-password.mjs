// Ажилтны нууц үгийг шинэчилнэ (нууц үгээ мартсан үед).
// Хэрэглээ: .env.local дотор ADMIN_PHONE, ADMIN_PASSWORD-оо шинэ утгаар бичээд
//   npm run reset-password
import { createClient } from "@supabase/supabase-js";

const env = (k) => {
  const v = process.env[k];
  if (!v) throw new Error(`.env.local дотор ${k} алга`);
  return v;
};
const url = (process.env.SUPABASE_URL || env("NEXT_PUBLIC_SUPABASE_URL")).replace(/\/+$/, "");
const db = createClient(url, env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });

const phone = env("ADMIN_PHONE").replace(/\D/g, "");
const password = env("ADMIN_PASSWORD");
if (password.length < 8) throw new Error("ADMIN_PASSWORD хамгийн багадаа 8 тэмдэгт");

const { data: emp, error } = await db.from("employees").select("user_id, full_name").eq("phone", phone).maybeSingle();
if (error) throw error;
if (!emp?.user_id) throw new Error(`${phone} дугаартай ажилтан олдсонгүй`);

const { error: uErr } = await db.auth.admin.updateUserById(emp.user_id, { password });
if (uErr) throw uErr;
console.log(`Бэлэн! ${emp.full_name} (${phone}) шинэ нууц үгээр нэвтэрнэ үү.`);
