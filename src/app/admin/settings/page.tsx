import { redirect } from "next/navigation";

/** Тохиргоо = апп эрх (Аппаар / Ажилтнаар). Алба хэлтэс тусдаа цэстэй. */
export default function SettingsHome() {
  redirect("/admin/settings/permissions");
}
