import Link from "next/link";
import { requireStaffAdmin } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/types";
import { AdminNav } from "./admin-nav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const me = await requireStaffAdmin();
  return (
    <div className="min-h-dvh md:flex">
      <aside className="bg-gray-900 text-gray-200 md:sticky md:top-0 md:h-dvh md:w-60 md:shrink-0">
        <div className="flex items-center justify-between px-4 py-4 md:block">
          <div>
            <span className="rounded bg-brand px-2 py-0.5 text-xs font-bold tracking-wider text-white">ЦАГ БҮРТГЭЛ</span>
            <p className="mt-2 hidden text-sm md:block">{me.full_name}</p>
            <p className="hidden text-xs text-gray-400 md:block">{ROLE_LABELS[me.role]}</p>
          </div>
          <Link href="/app" className="text-xs text-gray-400 hover:text-white md:mt-3 md:inline-block">← Ажилтны апп</Link>
        </div>
        <AdminNav isAdmin={me.role === "admin"} />
      </aside>
      <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
