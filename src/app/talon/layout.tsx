import Link from "next/link";
import { requireStaffAdmin } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/types";
import { TalonTabs } from "./talon-tabs";

/** Талон апп: удирдлага (админ, менежер) талон зарах, бүртгэл хянах, харилцагч, тохиргоо */
export default async function TalonAppLayout({ children }: { children: React.ReactNode }) {
  const me = await requireStaffAdmin();
  return (
    <div className="mx-auto flex min-h-dvh max-w-6xl flex-col">
      <header className="rounded-b-3xl bg-gray-900 px-5 pb-10 pt-[max(1.25rem,env(safe-area-inset-top))] text-white shadow">
        <div className="flex items-center justify-between gap-3">
          <Link href="/talon">
            <p className="text-xs opacity-70">{me.full_name} · {ROLE_LABELS[me.role]}</p>
            <h1 className="text-lg font-bold">🎫 Талон апп</h1>
          </Link>
          <div className="flex flex-wrap justify-end gap-2 text-xs">
            <Link href="/app" className="rounded-full bg-white/15 px-3 py-1">Ирц бүртгэл</Link>
            <Link href="/station" className="rounded-full bg-white/15 px-3 py-1">⛽ ШТС</Link>
            <Link href="/admin" className="rounded-full bg-white/15 px-3 py-1">Удирдлага</Link>
          </div>
        </div>
      </header>
      <div className="-mt-7 px-4">
        <div className="card p-2">
          <TalonTabs isAdmin={me.role === "admin"} />
        </div>
      </div>
      <main className="flex-1 space-y-4 px-4 py-4 pb-12">{children}</main>
    </div>
  );
}
