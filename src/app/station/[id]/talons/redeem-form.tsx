"use client";

import { useActionState, useState } from "react";
import { redeemTalons, type RedeemState } from "./actions";
import { TalonRangeFields } from "@/components/talon-range-fields";
import { FormMessage } from "@/components/form-message";

export function RedeemForm({ stationId, today, minDate }: { stationId: string; today: string; minDate: string }) {
  // Амжилттай бол сериалын талбаруудыг цэвэрлэж (key солих) дараагийн талонд бэлдэнэ
  const [formKey, setFormKey] = useState(0);
  const [state, action, pending] = useActionState(async (prev: RedeemState, f: FormData) => {
    const res = await redeemTalons(prev, f);
    if (res?.ok) setFormKey((k) => k + 1);
    return res;
  }, null);

  return (
    <form action={action} className="card space-y-3">
      <input type="hidden" name="station_id" value={stationId} />
      <h2 className="font-semibold">🎫 Ашигласан талон бүртгэх</h2>
      <p className="text-xs text-gray-500">Харилцагч талоноор шатахуун авсан бол сериалыг оруулна. Олон талон бол эхний, сүүлийн дугаарыг бичнэ.</p>
      <TalonRangeFields key={formKey} autoFocus />
      {minDate < today ? (
        <div>
          <label className="label">Огноо (нөхөж оруулах бол өөрчилнө)</label>
          <input type="date" name="date" className="input" defaultValue={today} min={minDate} max={today} required />
        </div>
      ) : (
        <input type="hidden" name="date" value={today} />
      )}
      <FormMessage state={state} />
      <button className="btn-primary w-full" disabled={pending}>{pending ? "Шалгаж байна..." : "Бүртгэлд оруулах"}</button>
    </form>
  );
}
