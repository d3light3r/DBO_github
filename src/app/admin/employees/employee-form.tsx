"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import { saveEmployee } from "../actions";
import { FormMessage } from "@/components/form-message";
import type { Employee } from "@/lib/types";

type Opt = { id: string; name: string; kind?: string };
type Props = { departments: Opt[]; branches: Opt[]; schedules: Opt[]; employee?: Employee };

export function EmployeeForm({ departments, branches, schedules, employee }: Props) {
  const [state, action, pending] = useActionState(saveEmployee, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok && !employee) ref.current?.reset();
  }, [state, employee]);
  const e = employee;

  return (
    <form ref={ref} action={action} className="card h-fit space-y-3">
      <h2 className="font-semibold">{e ? "Мэдээлэл засах" : "Шинэ ажилтан"}</h2>
      {e && <input type="hidden" name="id" value={e.id} />}
      <div className="grid grid-cols-3 gap-2">
        <div><label className="label">Код</label><input name="emp_code" className="input" defaultValue={e?.emp_code} required /></div>
        <div className="col-span-2"><label className="label">Овог нэр</label><input name="full_name" className="input" defaultValue={e?.full_name} placeholder="Б.Бат-Эрдэнэ" required /></div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div><label className="label">Утас (нэвтрэх нэр)</label><input name="phone" inputMode="tel" className="input" defaultValue={e?.phone} required /></div>
        <div>
          <label className="label">{e ? "Шинэ нууц үг (солих бол)" : "Анхны нууц үг"}</label>
          <input name="password" className="input" autoComplete="new-password" required={!e} minLength={8} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Select name="department_id" label="Хэлтэс" options={departments} value={e?.department_id} />
        <Select name="branch_id" label="Салбар / ШТС (ирц бүртгэх байршил)" options={branches} value={e?.branch_id} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Select name="schedule_id" label="Хуваарь" options={schedules} value={e?.schedule_id} />
        <div>
          <label className="label">Ээлж эхлэх өдөр</label>
          <input type="date" name="cycle_anchor_date" className="input" defaultValue={e?.cycle_anchor_date ?? ""} />
        </div>
      </div>
      <p className="-mt-1 text-xs text-gray-500">&quot;Ээлж эхлэх өдөр&quot; нь зөвхөн 24/48 мэт ээлжийн хуваарьт хэрэгтэй: ажилтны ээлжинд гарсан аль нэг өдөр.</p>
      <div>
        <label className="label">Эрх</label>
        <select name="role" className="input" defaultValue={e?.role ?? "employee"}>
          <option value="employee">Ажилтан</option>
          <option value="manager">Менежер (ирц харах, хүсэлт батлах)</option>
          <option value="admin">Админ (бүх тохиргоо)</option>
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="allow_trip" defaultChecked={e?.allow_trip} className="accent-brand" /> Томилолтоор сельфигээр бүртгүүлэх эрхтэй</label>
      {e && <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_active" defaultChecked={e.is_active} className="accent-brand" /> Идэвхтэй (ажилд байгаа)</label>}
      <FormMessage state={state} />
      <div className="flex gap-2">
        <button className="btn-primary" disabled={pending}>{e ? "Хадгалах" : "Нэмэх"}</button>
        {e && <Link href="/admin/employees" className="btn-ghost">Болих</Link>}
      </div>
    </form>
  );
}

function Select({ name, label, options, value }: { name: string; label: string; options: Opt[]; value?: string | null }) {
  return (
    <div>
      <label className="label">{label}</label>
      <select name={name} className="input" defaultValue={value ?? ""}>
        <option value="">—</option>
        {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
    </div>
  );
}
