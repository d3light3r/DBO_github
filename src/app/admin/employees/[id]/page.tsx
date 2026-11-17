import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Employee } from "@/lib/types";
import { EmployeeForm } from "../employee-form";
import { loadOptions } from "../options";

export default async function EditEmployee({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireAdmin();
  const { id } = await params;
  const [{ data }, opts] = await Promise.all([
    createAdminClient().from("employees").select("*").eq("id", id).eq("organization_id", me.organization_id).maybeSingle(),
    loadOptions(me.organization_id),
  ]);
  if (!data) notFound();
  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-2xl font-bold">{(data as Employee).full_name}</h1>
      <EmployeeForm {...opts} employee={data as Employee} />
    </div>
  );
}
