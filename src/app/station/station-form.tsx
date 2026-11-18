"use client";

import { useActionState, useState } from "react";
import { saveStation } from "./actions";

type StationValue = { id: string; name: string; latitude: number; longitude: number; radius_meters: number; is_active: boolean };

export function StationForm({ station }: { station?: StationValue }) {
  const [state, action, pending] = useActionState(saveStation, null);
  const [lat, setLat] = useState(station ? String(station.latitude) : "");
  const [lng, setLng] = useState(station ? String(station.longitude) : "");
  const [locMsg, setLocMsg] = useState<string | null>(null);

  function useMyLocation() {
    setLocMsg("Байршил тодорхойлж байна...");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLat(p.coords.latitude.toFixed(7));
        setLng(p.coords.longitude.toFixed(7));
        setLocMsg(`Авлаа (нарийвчлал ±${Math.round(p.coords.accuracy)}м). Станц дээрээ байгаа үедээ дарна уу.`);
      },
      () => setLocMsg("Байршил авч чадсангүй. Утасны байршлын зөвшөөрлөө шалгана уу."),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }

  const latN = Number(lat);
  const lngN = Number(lng);
  const hasPoint = lat !== "" && lng !== "" && Number.isFinite(latN) && Number.isFinite(lngN);

  return (
    <form action={action} className="card space-y-3">
      <h2 className="font-semibold">{station ? "Станцын мэдээлэл" : "＋ Шинэ ШТС нэмэх"}</h2>
      {station && <input type="hidden" name="id" value={station.id} />}
      <div>
        <label className="label">Нэр</label>
        <input name="name" defaultValue={station?.name} className="input" placeholder="ШТС-1 Зайсан" required />
      </div>
      <div>
        <label className="label">Ирц бүртгэх байршил</label>
        <button type="button" onClick={useMyLocation} className="btn-ghost mb-2 w-full">📍 Одоогийн байршлаа авах</button>
        {locMsg && <p className="mb-2 text-xs text-gray-500">{locMsg}</p>}
        <div className="grid grid-cols-2 gap-2">
          <input name="latitude" value={lat} onChange={(e) => setLat(e.target.value)} inputMode="decimal" className="input" placeholder="Өргөрөг 47.91" required />
          <input name="longitude" value={lng} onChange={(e) => setLng(e.target.value)} inputMode="decimal" className="input" placeholder="Уртраг 106.91" required />
        </div>
        {hasPoint && (
          <a
            className="mt-1 inline-block text-xs text-brand underline"
            target="_blank"
            rel="noreferrer"
            href={`https://www.google.com/maps?q=${latN},${lngN}`}
          >
            Газрын зураг дээр шалгах ↗
          </a>
        )}
      </div>
      <div>
        <label className="label">Зөвшөөрөх радиус (метр)</label>
        <input name="radius_meters" defaultValue={station?.radius_meters ?? 100} inputMode="numeric" className="input" />
        <p className="mt-1 text-xs text-gray-500">Ажилтан энэ цэгээс энэ зайн дотор байж «Ирлээ» дарна.</p>
      </div>
      {station && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="is_active" defaultChecked={station.is_active} className="h-4 w-4 accent-brand" /> Идэвхтэй
        </label>
      )}
      {state && <p className={`text-sm ${state.ok ? "text-emerald-700" : "text-brand"}`}>{state.message}</p>}
      <button className="btn-primary w-full" disabled={pending}>{pending ? "Хадгалж байна..." : station ? "Хадгалах" : "Станц нэмэх"}</button>
    </form>
  );
}
