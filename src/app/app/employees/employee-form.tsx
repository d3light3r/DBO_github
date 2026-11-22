"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { saveEmployee } from "@/app/admin/actions";
import { FormMessage } from "@/components/form-message";
import type { Employee } from "@/lib/types";

type Opt = { id: string; name: string; kind?: string };
type Props = {
  companies: Opt[];
  departments: (Opt & { company_id: string | null })[];
  units: (Opt & { department_id: string; is_station: boolean; is_active: boolean })[];
  branches: Opt[];
  schedules: Opt[];
  employee?: Employee;
};

export function EmployeeForm({ companies, departments, units, branches, schedules, employee }: Props) {
  const [state, action, pending] = useActionState(saveEmployee, null);
  const ref = useRef<HTMLFormElement>(null);
  const e = employee;
  // Компани → Алба хэлтэс → Салбар дараалсан сонголт
  const [companyId, setCompanyId] = useState(e?.company_id ?? (companies.length === 1 ? companies[0].id : ""));
  const [deptId, setDeptId] = useState(e?.department_id ?? "");
  const [unitId, setUnitId] = useState(e?.unit_id ?? "");
  // Амжилттай нэмсний дараа маягтыг цэвэрлэнэ
  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    if (state?.ok && !employee) {
      setDeptId("");
      setUnitId("");
    }
  }
  useEffect(() => {
    if (state?.ok && !employee) ref.current?.reset();
  }, [state, employee]);
  const deptOpts = departments.filter((d) => d.company_id === companyId);
  const unitOpts = units.filter((u) => u.department_id === deptId && (u.is_active || u.id === unitId));
  const unit = units.find((u) => u.id === unitId);

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
      <fieldset className="space-y-2 rounded-xl bg-gray-50 p-3">
        <legend className="px-1 text-xs font-semibold text-gray-600">Харьяалал</legend>
        <div>
          <label className="label">1. Компани</label>
          <select
            name="company_id"
            className="input"
            value={companyId}
            onChange={(ev) => {
              setCompanyId(ev.target.value);
              setDeptId("");
              setUnitId("");
            }}
          >
            <option value="">—</option>
            {companies.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label">2. Алба хэлтэс</label>
            <select
              name="department_id"
              className="input"
              value={deptId}
              disabled={!companyId}
              onChange={(ev) => {
                setDeptId(ev.target.value);
                setUnitId("");
              }}
            >
              <option value="">—</option>
              {deptOpts.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">3. Салбар</label>
            <select name="unit_id" className="input" value={unitId} disabled={!deptId} onChange={(ev) => setUnitId(ev.target.value)}>
              <option value="">—</option>
              {unitOpts.map((o) => <option key={o.id} value={o.id}>{o.is_station ? `⛽ ${o.name}` : o.name}</option>)}
            </select>
          </div>
        </div>
        {unit?.is_station && <p className="text-xs text-emerald-700">⛽ ШТС салбар: энэ ажилтан «{unit.name}»-ийн ШТС апп-д орно.</p>}
        {companies.length === 0 && (
          <p className="text-xs text-brand">Эхлээд <Link href="/admin/settings/structure" className="underline">Тохиргоо → Компани, бүтэц</Link> хэсгээс компани нэмнэ үү.</p>
        )}
      </fieldset>
      <Select name="branch_id" label="📍 Координат (ирц бүртгэх цэг)" options={branches} value={e?.branch_id} />
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
      {e ? (
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="require_device" defaultChecked={e.require_device} className="mt-0.5 accent-brand" />
          <span>📱 Утасны бүртгэл <span className="block text-xs text-gray-500">Чагтыг авбал түр цуцлагдаж, аль ч төхөөрөмжөөс цаг бүртгүүлнэ.</span></span>
        </label>
      ) : (
        <>
          {/* Шинэ ажилтан заавал бүртгэлтэй утаснаасаа цаг бүртгүүлнэ */}
          <input type="hidden" name="require_device" value="on" />
          <p className="text-xs text-gray-500">📱 Ажилтан анх нэвтэрч өөрийн утсаа бүртгүүлэн, админ баталсны дараа цаг бүртгүүлнэ.</p>
        </>
      )}
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="allow_trip" defaultChecked={e?.allow_trip} className="accent-brand" /> Томилолтоор сельфигээр бүртгүүлэх эрхтэй</label>
      {e && <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_active" defaultChecked={e.is_active} className="accent-brand" /> Идэвхтэй (ажилд байгаа)</label>}
      <FormMessage state={state} />
      <div className="flex gap-2">
        <button className="btn-primary" disabled={pending}>{e ? "Хадгалах" : "Нэмэх"}</button>
        {e && <Link href="/app/employees" className="btn-ghost">Болих</Link>}
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
