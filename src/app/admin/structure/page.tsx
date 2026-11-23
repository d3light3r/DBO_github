import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Company, Department, Unit } from "@/lib/types";
import { ConfirmButton } from "@/components/confirm-button";
import { Icon } from "@/components/icons";
import { Modal } from "@/components/modal";
import { deleteCompany, deleteDepartment, deleteUnit, saveCompany, saveDepartment, saveUnit } from "../actions";

function Count({ n, dark = false }: { n: number; dark?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${dark ? "bg-gray-900/5 text-gray-700" : "bg-white text-gray-700 ring-1 ring-gray-200"}`}>
      <Icon name="users" className="h-3.5 w-3.5" /> {n} ажилтан
    </span>
  );
}

const iconBtn = "rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700";

export default async function StructurePage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const me = await requireAdmin();
  const { view } = await searchParams;
  const list = view === "list";
  const db = createAdminClient();
  const org = me.organization_id;
  const [{ data: c }, { data: d }, { data: u }, { data: e }] = await Promise.all([
    db.from("companies").select("*").eq("organization_id", org).order("created_at"),
    db.from("departments").select("*").eq("organization_id", org).order("name"),
    db.from("units").select("*").eq("organization_id", org).order("name"),
    db.from("employees").select("id, full_name, company_id, department_id, unit_id").eq("organization_id", org).eq("is_active", true).order("full_name"),
  ]);
  const companies = (c ?? []) as Company[];
  const depts = (d ?? []) as Department[];
  const units = (u ?? []) as Unit[];
  const emps = e ?? [];
  const byCompany = (id: string) => emps.filter((x) => x.company_id === id).length;
  const byDept = (id: string) => emps.filter((x) => x.department_id === id).length;
  const byUnit = (id: string) => emps.filter((x) => x.unit_id === id).length;
  const noDept = emps.filter((x) => !x.department_id).length;
  const empName = new Map(emps.map((x) => [x.id, x.full_name as string]));
  const approverSelect = (value?: string | null) => (
    <div>
      <label className="label">✅ Хүсэлт батлагч</label>
      <select name="approver_id" className="input" defaultValue={value ?? ""}>
        <option value="">— Админ батална</option>
        {emps.map((x) => <option key={x.id} value={x.id}>{x.full_name}</option>)}
      </select>
      <p className="mt-1 text-xs text-gray-500">Энэ алба хэлтсийн ажилтнуудын цагийн хүсэлтийг батална.</p>
    </div>
  );

  const addDepartment = (
    <Modal label={<><Icon name="plus" /> Алба хэлтэс нэмэх</>} title="Алба хэлтэс нэмэх" closeOnSubmit buttonClassName="btn-primary">
      {companies.length === 0 ? (
        <p className="text-sm text-gray-500">Эхлээд компани нэмнэ үү.</p>
      ) : (
        <form action={saveDepartment} className="space-y-3">
          <div>
            <label className="label">Компани</label>
            <select name="company_id" className="input" required defaultValue={companies.length === 1 ? companies[0].id : ""}>
              <option value="" disabled>Сонгох</option>
              {companies.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
          </div>
          <div><label className="label">Нэр</label><input name="name" className="input" placeholder="Борлуулалтын алба" required /></div>
          {approverSelect()}
          <button className="btn-primary w-full">Нэмэх</button>
        </form>
      )}
    </Modal>
  );

  const addCompany = (
    <Modal label={<><Icon name="building" /> Компани нэмэх</>} title="Компани нэмэх" closeOnSubmit buttonClassName="btn-ghost">
      <form action={saveCompany} className="space-y-3">
        <div><label className="label">Компанийн нэр</label><input name="name" className="input" required /></div>
        <button className="btn-primary w-full">Нэмэх</button>
      </form>
    </Modal>
  );

  /** Алба хэлтсийн засах цонх: нэр, салбарууд */
  const deptEditor = (dp: Department) => {
    const myUnits = units.filter((x) => x.department_id === dp.id);
    return (
      <Modal label={<Icon name="edit" />} title={`Алба хэлтэс: ${dp.name}`} buttonClassName={iconBtn}>
        <div className="space-y-4">
          <form action={saveDepartment} className="space-y-3">
            <input type="hidden" name="id" value={dp.id} />
            <input type="hidden" name="company_id" value={dp.company_id ?? ""} />
            <div><label className="label">Нэр</label><input name="name" defaultValue={dp.name} className="input" required /></div>
            {approverSelect(dp.approver_id)}
            <button className="btn-primary w-full">Хадгалах</button>
          </form>

          <div>
            <h3 className="mb-1 text-sm font-semibold">Салбарууд</h3>
            <ul className="space-y-1.5">
              {myUnits.map((un) => (
                <li key={un.id} className="rounded-xl bg-gray-50 p-2">
                  <form action={saveUnit} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="id" value={un.id} />
                    <input type="hidden" name="department_id" value={dp.id} />
                    <input name="name" defaultValue={un.name} className="input w-auto flex-1 bg-white py-1 text-sm" required />
                    <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="is_station" defaultChecked={un.is_station} className="accent-brand" />⛽ ШТС</label>
                    <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="is_active" defaultChecked={un.is_active} className="accent-brand" />Идэвхтэй</label>
                    <button className="btn-ghost px-2 py-1 text-xs">Хадгалах</button>
                  </form>
                  <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
                    <span>👥 {byUnit(un.id)} ажилтан</span>
                    {byUnit(un.id) === 0 && (
                      <form action={deleteUnit}>
                        <input type="hidden" name="id" value={un.id} />
                        <ConfirmButton message={`«${un.name}» салбарыг устгах уу?`}>Устгах</ConfirmButton>
                      </form>
                    )}
                  </div>
                </li>
              ))}
              {myUnits.length === 0 && <li className="text-sm text-gray-400">Салбар алга</li>}
            </ul>
            <form action={saveUnit} className="mt-2 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-2">
              <input type="hidden" name="department_id" value={dp.id} />
              <input name="name" className="input w-auto flex-1 py-1 text-sm" placeholder="Шинэ салбар" required />
              <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="is_station" className="accent-brand" />⛽ ШТС</label>
              <button className="btn-primary px-3 py-1 text-xs"><Icon name="plus" /> Салбар нэмэх</button>
            </form>
          </div>

          {myUnits.length === 0 && byDept(dp.id) === 0 && (
            <form action={deleteDepartment} className="border-t border-gray-100 pt-3 text-right">
              <input type="hidden" name="id" value={dp.id} />
              <ConfirmButton message={`«${dp.name}» алба хэлтсийг устгах уу?`} className="text-sm text-brand">Алба хэлтсийг устгах</ConfirmButton>
            </form>
          )}
        </div>
      </Modal>
    );
  };

  const companyEditor = (co: Company) => (
    <Modal label={<Icon name="edit" />} title={`Компани: ${co.name}`} closeOnSubmit buttonClassName={iconBtn}>
      <form action={saveCompany} className="flex gap-2">
        <input type="hidden" name="id" value={co.id} />
        <input name="name" defaultValue={co.name} className="input" required />
        <button className="btn-ghost">Хадгалах</button>
      </form>
      {depts.every((x) => x.company_id !== co.id) && (
        <form action={deleteCompany} className="mt-3 text-right">
          <input type="hidden" name="id" value={co.id} />
          <ConfirmButton message={`«${co.name}» компанийг устгах уу?`} className="text-sm text-brand">Компанийг устгах</ConfirmButton>
        </form>
      )}
    </Modal>
  );

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Алба хэлтэс</h1>
      {/* Толгой: табууд + үйлдэл */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200">
        <nav className="flex gap-1">
          {[
            { v: "", label: "Шатлал", icon: "tree" as const },
            { v: "list", label: "Жагсаалт", icon: "report" as const },
          ].map((t) => {
            const active = (t.v === "list") === list;
            return (
              <Link
                key={t.label}
                href={t.v ? "?view=list" : "?"}
                className={`-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm ${active ? "border-brand font-semibold text-gray-900" : "border-transparent text-gray-500"}`}
              >
                <Icon name={t.icon} /> {t.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex flex-wrap items-center gap-2 pb-2">
          <Link href="/app/employees?filter=nodept" className="flex items-center gap-2 rounded-xl bg-white px-3 py-1.5 text-sm ring-1 ring-gray-200">
            Алба хэлтэсгүй ажилтан:
            <span className={`rounded-full px-2 text-xs font-bold text-white ${noDept ? "bg-brand" : "bg-gray-300"}`}>{noDept}</span>
          </Link>
          {addCompany}
          {addDepartment}
        </div>
      </div>

      {companies.length === 0 && <p className="card text-sm text-gray-500">Компани алга. «Компани нэмэх» дарж эхлүүлнэ үү.</p>}

      {!list ? (
        /* ---------------- Шатлал ---------------- */
        companies.map((co) => {
          const myDepts = depts.filter((x) => x.company_id === co.id);
          return (
            <section key={co.id} className="card overflow-x-auto py-8">
              <div className="mx-auto flex w-max min-w-full flex-col items-center">
                {/* Компани */}
                <div className="flex flex-col items-center gap-2">
                  <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-soft text-brand">
                    <Icon name="building" className="h-9 w-9" />
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="font-bold">{co.name}</span>
                    {companyEditor(co)}
                  </div>
                  <Count n={byCompany(co.id)} dark />
                </div>

                {myDepts.length > 0 && (
                  <>
                    <div className="h-6 w-px bg-gray-300" />
                    <div className="flex">
                      {myDepts.map((dp, i) => {
                        const myUnits = units.filter((x) => x.department_id === dp.id);
                        return (
                          <div key={dp.id} className="relative flex flex-col items-center px-2.5 pt-6">
                            {/* холбох шугам */}
                            <span
                              className="absolute top-0 h-px bg-gray-300"
                              style={{ left: i === 0 ? "50%" : 0, right: i === myDepts.length - 1 ? "50%" : 0 }}
                            />
                            <span className="absolute top-0 h-6 w-px bg-gray-300" />
                            <div className="w-56 rounded-2xl bg-gray-50 p-3 text-center ring-1 ring-gray-200">
                              <div className="flex items-start justify-between gap-1">
                                <span className="w-6" />
                                <h3 className="flex-1 font-semibold leading-tight">{dp.name}</h3>
                                {deptEditor(dp)}
                              </div>
                              <div className="mt-2"><Count n={byDept(dp.id)} /></div>
                              <p className="mt-1.5 truncate text-xs text-gray-500">✅ Батлагч: {dp.approver_id ? empName.get(dp.approver_id) ?? "—" : "Админ"}</p>
                              {myUnits.length > 0 && (
                                <ul className="mt-3 space-y-1 border-t border-gray-200 pt-2 text-left text-sm">
                                  {myUnits.map((un) => (
                                    <li key={un.id} className={`flex items-center justify-between rounded-lg bg-white px-2 py-1 ${un.is_active ? "" : "opacity-50"}`}>
                                      <span className="truncate">{un.is_station ? "⛽ " : ""}{un.name}</span>
                                      <span className="text-xs text-gray-500">👥 {byUnit(un.id)}</span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </section>
          );
        })
      ) : (
        /* ---------------- Жагсаалт ---------------- */
        <div className="card overflow-x-auto p-0">
          <table className="table">
            <thead><tr><th>Компани</th><th>Алба хэлтэс</th><th>Батлагч</th><th>Салбар</th><th>Ажилтан</th><th></th></tr></thead>
            <tbody>
              {companies.flatMap((co) => {
                const myDepts = depts.filter((x) => x.company_id === co.id);
                if (myDepts.length === 0)
                  return [<tr key={co.id}><td className="font-semibold">{co.name}</td><td colSpan={3} className="text-gray-400">—</td><td>{byCompany(co.id)}</td><td>{companyEditor(co)}</td></tr>];
                return myDepts.map((dp, i) => {
                  const myUnits = units.filter((x) => x.department_id === dp.id);
                  return (
                    <tr key={dp.id}>
                      <td className="font-semibold">{i === 0 ? <span className="flex items-center gap-1">{co.name} {companyEditor(co)}</span> : ""}</td>
                      <td>{dp.name}</td>
                      <td className="text-xs">{dp.approver_id ? empName.get(dp.approver_id) ?? "—" : <span className="text-gray-400">Админ</span>}</td>
                      <td className="text-xs">
                        {myUnits.length ? myUnits.map((un) => <span key={un.id} className="mr-1 inline-block rounded bg-gray-100 px-1.5 py-0.5">{un.is_station ? "⛽ " : ""}{un.name} · {byUnit(un.id)}</span>) : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="font-semibold tabular-nums">{byDept(dp.id)}</td>
                      <td>{deptEditor(dp)}</td>
                    </tr>
                  );
                });
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-gray-400">
        ✏️ дээр дарж нэр засах, салбар нэмэх, ⛽ ШТС тэмдэглэнэ. Ажилтантай эсвэл доод нэгжтэй зүйлийг устгах боломжгүй.
      </p>
    </div>
  );
}
