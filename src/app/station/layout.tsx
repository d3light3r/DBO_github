import Link from "next/link";
import { stationContext } from "@/lib/station-access";

export default async function StationAppLayout({ children }: { children: React.ReactNode }) {
  const { emp, isStaffAdmin } = await stationContext();
  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col">
      <header className="rounded-b-3xl bg-gray-900 px-5 pb-6 pt-[max(1.25rem,env(safe-area-inset-top))] text-white shadow">
        <div className="flex items-center justify-between gap-3">
          <Link href="/station">
            <p className="text-xs opacity-70">{emp.full_name}</p>
            <h1 className="text-lg font-bold">⛽ ШТС апп</h1>
          </Link>
          <div className="flex gap-2 text-xs">
            <Link href="/app" className="rounded-full bg-white/15 px-3 py-1">Ирц бүртгэл</Link>
            {isStaffAdmin && <Link href="/admin" className="rounded-full bg-white/15 px-3 py-1">Удирдлага</Link>}
          </div>
        </div>
      </header>
      <main className="flex-1 space-y-4 px-4 py-4 pb-12">{children}</main>
    </div>
  );
}
