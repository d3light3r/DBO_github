"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { saveTalonSettings, sellTalons, undoTalons, type FormState } from "./actions";
import { FormMessage } from "@/components/form-message";
import { TalonRangeFields } from "@/components/talon-range-fields";
import { CustomerPicker } from "@/components/customer-picker";

type Customer = { id: string; name: string; register: string | null };

export function SellForm({ customers, today }: { customers: Customer[]; today: string }) {
  // Амжилттай бол сериалын талбаруудыг цэвэрлэнэ (key солих)
  const [k, setK] = useState(0);
  const [state, action, pending] = useActionState(async (prev: FormState, f: FormData) => {
    const res = await sellTalons(prev, f);
    if (res?.ok) setK((x) => x + 1);
    return res;
  }, null);

  return (
    <form action={action} className="card space-y-3">
      <h2 className="font-semibold">Талон зарах</h2>
      <div>
        <label className="label">Харилцагч</label>
        <CustomerPicker customers={customers} />
        <Link href="/talon/customers" className="mt-1 inline-block text-xs text-brand">+ Шинэ харилцагч нэмэх</Link>
      </div>
      <TalonRangeFields key={k} />
      <div>
        <label className="label">Зарсан огноо</label>
        <input type="date" className="input cursor-not-allowed bg-gray-100 text-gray-500" value={today} disabled readOnly />
      </div>
      <FormMessage state={state} />
      <button className="btn-primary w-full" disabled={pending}>{pending ? "Бүртгэж байна..." : "Зарсныг бүртгэх"}</button>
    </form>
  );
}

export function SettingsForm({ backdateDays }: { backdateDays: number | null }) {
  const [state, action, pending] = useActionState(saveTalonSettings, null);
  return (
    <form action={action} className="card space-y-3">
      <h2 className="font-semibold">Нөхөж оруулах хязгаар</h2>
      <div>
        <label className="label">Хэдэн өдрөөр нөхөж оруулахыг зөвшөөрөх</label>
        <input type="number" name="backdate_days" min={0} max={365} className="input" defaultValue={backdateDays ?? ""} placeholder="Хоосон = зөвхөн тухайн өдөр" />
        <p className="mt-1 text-xs text-gray-500">Жишээ нь 3 бол ажилтан өнөөдрөөс 3 хоногийн өмнөх огноогоор оруулж болно. Тохируулаагүй бол тухайн өдрөөр нь бүртгэнэ.</p>
      </div>
      <FormMessage state={state} />
      <button className="btn-primary" disabled={pending}>Хадгалах</button>
    </form>
  );
}

export function UndoForm() {
  const [state, action, pending] = useActionState(undoTalons, null);
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm("Сонгосон мужийн бүртгэлийг буцаах уу?")) e.preventDefault();
      }}
      className="card space-y-3"
    >
      <h2 className="font-semibold">Алдаа засах</h2>
      <select name="mode" className="input" defaultValue="redeem">
        <option value="redeem">Салбарт оруулсныг цуцлах</option>
        <option value="sale">Зарсан бүртгэлийг устгах (ашиглаагүй талон)</option>
      </select>
      <TalonRangeFields />
      <FormMessage state={state} />
      <button className="btn-ghost" disabled={pending}>Буцаах</button>
    </form>
  );
}
