import { redirect } from "next/navigation";
import { APPS } from "@/lib/permissions";

/** Аппаар: эхний апп руу шууд */
export default function PermissionsHome() {
  redirect(`/admin/settings/permissions/${APPS[0].key}`);
}
