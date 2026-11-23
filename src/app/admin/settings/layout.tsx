import { requireAdmin } from "@/lib/auth";
import { SettingsTabs } from "./settings-tabs";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Тохиргоо</h1>
      <SettingsTabs />
      {children}
    </div>
  );
}
