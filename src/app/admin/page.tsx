import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { APPS } from "@/lib/permissions";

const OPEN: Record<string, string> = { attendance: "/app/dashboard", station: "/station", talon: "/talon" };

/** Удирдлага: апп-ууд руу орох, эрх тохируулах */
export default async function AdminHome() {
  await requireAdmin();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Апп-ууд</h1>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {APPS.map((a) => (
          <div key={a.key} className="card flex flex-col gap-3">
            <div>
              <p className="text-lg font-semibold">{a.title}</p>
              <p className="text-xs text-gray-500">{a.desc}</p>
              <p className="mt-2 text-xs text-gray-700">{a.perms.map((p) => p.label).join(" · ")}</p>
            </div>
            <div className="mt-auto flex gap-2">
              <Link href={OPEN[a.key]} className="btn-primary flex-1 text-center">Нээх →</Link>
              <Link href={`/admin/settings/permissions/${a.key}`} className="btn-ghost">Эрх</Link>
            </div>
          </div>
        ))}
      </div>
      <p className="text-sm text-gray-500">
        Ирц, цагийн хүсэлт, тайлан, ажилтан, хуваарь, байршил, утас бүртгэл, баярын болон ажлын өдөр одоо <b>🕒 Цаг бүртгэл апп</b>-д байна. Энд зөвхөн алба хэлтэс,
        тохиргоо (апп эрх, компани бүтэц) үлдсэн.
      </p>
    </div>
  );
}
