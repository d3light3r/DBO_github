"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { saveBranch } from "../../actions";
import { FormMessage } from "@/components/form-message";
import type { Branch } from "@/lib/types";

export function BranchForm({ branch }: { branch?: Branch }) {
  const [state, action, pending] = useActionState(saveBranch, null);
  const [lat, setLat] = useState(branch ? String(branch.latitude) : "");
  const [lng, setLng] = useState(branch ? String(branch.longitude) : "");
  const [msg, setMsg] = useState<string | null>(null);

  function useHere() {
    setMsg("Байршил тодорхойлж байна...");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLat(p.coords.latitude.toFixed(7));
        setLng(p.coords.longitude.toFixed(7));
        setMsg(`Нарийвчлал ±${Math.round(p.coords.accuracy)}м`);
      },
      () => setMsg("Байршил авч чадсангүй."),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  function pasteMaps(e: React.ClipboardEvent<HTMLInputElement>) {
    // Google Maps-аас "47.918, 106.917" хэлбэрээр хуулбал хоёуланг нь бөглөнө
    const m = e.clipboardData.getData("text").match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
    if (m) {
      e.preventDefault();
      setLat(m[1]);
      setLng(m[2]);
    }
  }

  return (
    <form action={action} className="card h-fit space-y-3">
      <h2 className="font-semibold">{branch ? "Салбар засах" : "Шинэ салбар"}</h2>
      {branch && <input type="hidden" name="id" value={branch.id} />}
      <div><label className="label">Нэр</label><input name="name" className="input" defaultValue={branch?.name} placeholder="Төв оффис, ШТС-1..." required /></div>
      <div className="grid grid-cols-2 gap-2">
        <div><label className="label">Өргөрөг</label><input name="latitude" className="input" value={lat} onChange={(e) => setLat(e.target.value)} onPaste={pasteMaps} required /></div>
        <div><label className="label">Уртраг</label><input name="longitude" className="input" value={lng} onChange={(e) => setLng(e.target.value)} onPaste={pasteMaps} required /></div>
      </div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={useHere} className="btn-ghost text-xs">📍 Одоо байгаа байршил</button>
        {msg && <span className="text-xs text-gray-500">{msg}</span>}
      </div>
      <p className="text-xs text-gray-500">Эсвэл Google Maps дээр цэг дээр дарж гарсан координатыг хуулж &quot;Өргөрөг&quot; талбарт буулгана уу.</p>
      <div><label className="label">Зөвшөөрөх радиус (метр)</label><input name="radius_meters" type="number" min={20} max={5000} className="input" defaultValue={branch?.radius_meters ?? 100} /></div>
      <div>
        <label className="label">Wi-Fi public IP (заавал биш, таслалаар)</label>
        <input name="allowed_ips" className="input" defaultValue={branch?.allowed_ips.join(", ")} placeholder="202.131.x.x" />
        <p className="mt-1 text-xs text-gray-500">Салбарын Wi-Fi-д холбогдоод whatismyip.com-оос харна. Хоосон бол зөвхөн GPS-ээр шалгана.</p>
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_active" defaultChecked={branch?.is_active ?? true} className="accent-brand" /> Идэвхтэй</label>
      <FormMessage state={state} />
      <div className="flex gap-2">
        <button className="btn-primary" disabled={pending}>Хадгалах</button>
        {branch && <Link href="/admin/settings/branches" className="btn-ghost">Болих</Link>}
      </div>
    </form>
  );
}
