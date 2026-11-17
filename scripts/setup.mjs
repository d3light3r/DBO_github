// Анхны тохиргоо: байгууллага, анхны админ, үндсэн хуваарь үүсгэнэ.
// Ажиллуулах: node --env-file=.env.local scripts/setup.mjs
import { createClient } from "@supabase/supabase-js";

const env = (k) => {
  const v = process.env[k];
  if (!v) throw new Error(`.env.local дотор ${k} алга`);
  return v;
};
const db = createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false },
});
const phone = env("ADMIN_PHONE").replace(/\D/g, "");
const password = env("ADMIN_PASSWORD");
if (password.length < 6) throw new Error("ADMIN_PASSWORD хамгийн багадаа 6 тэмдэгт");

const { data: existing } = await db.from("organizations").select("id").limit(1);
if (existing?.length) {
  console.log("Байгууллага аль хэдийн үүссэн байна. Дахин ажиллуулах шаардлагагүй.");
  process.exit(0);
}

const { data: org, error: orgErr } = await db
  .from("organizations")
  .insert({ name: process.env.ORG_NAME || "Манай компани" })
  .select()
  .single();
if (orgErr) throw orgErr;

const { data: scheds, error: sErr } = await db
  .from("schedules")
  .insert([
    { organization_id: org.id, name: "Оффис 09:00-18:00", kind: "fixed", start_time: "09:00", end_time: "18:00", break_minutes: 60, work_weekdays: [1, 2, 3, 4, 5], late_grace_minutes: 5, cycle_length_days: null, work_days_in_cycle: null, shift_hours: null },
    { organization_id: org.id, name: "Ээлж 24/48", kind: "cycle", start_time: "09:00", end_time: "09:00", break_minutes: 0, work_weekdays: [], cycle_length_days: 3, work_days_in_cycle: 1, shift_hours: 24, late_grace_minutes: 10 },
  ])
  .select();
if (sErr) throw sErr;

const { data: user, error: uErr } = await db.auth.admin.createUser({
  email: `${phone}@staff.example.com`,
  password,
  email_confirm: true,
});
if (uErr) throw uErr;

const { error: eErr } = await db.from("employees").insert({
  organization_id: org.id,
  user_id: user.user.id,
  emp_code: "A001",
  full_name: process.env.ADMIN_NAME || "Админ",
  phone,
  role: "admin",
  schedule_id: scheds[0].id,
});
if (eErr) throw eErr;

console.log(`Бэлэн! ${phone} дугаар, таны нууц үгээр нэвтэрч /admin руу орно уу.`);
