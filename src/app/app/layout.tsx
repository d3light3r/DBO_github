import Link from "next/link";
import { getCurrentEmployee } from "@/lib/auth";
import { BottomNav } from "./bottom-nav";

export default async function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const emp = await getCurrentEmployee();
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col">
      <header className="rounded-b-3xl bg-brand px-5 pb-6 pt-[max(1.25rem,env(safe-area-inset-top))] text-white shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs opacity-80">Сайн байна уу,</p>
            <h1 className="text-lg font-bold">{emp.full_name}</h1>
          </div>
          {emp.role !== "employee" && (
            <Link href="/admin" className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium">
              Удирдлага →
            </Link>
          )}
        </div>
      </header>
      <main className="flex-1 space-y-4 px-4 py-4 pb-28">{children}</main>
      <BottomNav />
    </div>
  );
}
