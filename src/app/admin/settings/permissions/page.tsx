import Link from "next/link";
import { APPS } from "@/lib/permissions";

/** Апп эрх: апп жагсаалт → апп сонгоод ажилтан бүрт эрх оноох */
export default function PermissionsHome() {
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">Апп сонгоод тухайн апп-ын цэс бүрийг аль ажилтан харж, ашиглахыг тохируулна. Админ үргэлж бүх эрхтэй.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {APPS.map((a) => (
          <Link key={a.key} href={`/admin/settings/permissions/${a.key}`} className="card block transition hover:ring-brand">
            <span className="block text-lg font-semibold">{a.title}</span>
            <span className="block text-xs text-gray-500">{a.desc}</span>
            <span className="mt-2 block text-xs text-gray-700">{a.perms.map((p) => p.label).join(" · ")}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
