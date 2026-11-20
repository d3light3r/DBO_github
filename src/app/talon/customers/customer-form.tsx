"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import { saveCustomer } from "../actions";
import { FormMessage } from "@/components/form-message";

export type Customer = {
  id: string;
  name: string;
  register: string | null;
  phone: string | null;
  note: string | null;
  is_active: boolean;
};

export function CustomerForm({ customer }: { customer?: Customer }) {
  const [state, action, pending] = useActionState(saveCustomer, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok && !customer) ref.current?.reset();
  }, [state, customer]);

  return (
    <form ref={ref} action={action} className="card h-fit space-y-3">
      <h2 className="font-semibold">{customer ? "Харилцагч засах" : "Шинэ харилцагч"}</h2>
      {customer && <input type="hidden" name="id" value={customer.id} />}
      <div><label className="label">Нэр (байгууллага / хүн)</label><input name="name" className="input" defaultValue={customer?.name} required /></div>
      <div className="grid grid-cols-2 gap-2">
        <div><label className="label">Регистр</label><input name="register" className="input" defaultValue={customer?.register ?? ""} /></div>
        <div><label className="label">Утас</label><input name="phone" className="input" defaultValue={customer?.phone ?? ""} /></div>
      </div>
      <div><label className="label">Тэмдэглэл</label><input name="note" className="input" defaultValue={customer?.note ?? ""} /></div>
      {customer && (
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_active" defaultChecked={customer.is_active} className="accent-brand" /> Идэвхтэй</label>
      )}
      <FormMessage state={state} />
      <div className="flex gap-2">
        <button className="btn-primary" disabled={pending}>Хадгалах</button>
        {customer && <Link href="/talon/customers" className="btn-ghost">Болих</Link>}
      </div>
    </form>
  );
}
