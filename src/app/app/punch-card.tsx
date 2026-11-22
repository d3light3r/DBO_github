"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { punch } from "./actions";
import { compressImage } from "@/lib/image";
import { LocationHelp } from "./location-help";
import { detectDevice } from "@/lib/device-detect";

type Props = { isWorking: boolean; checkInAt: string | null; allowTrip: boolean };

function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) return reject(new Error("no-geo"));
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    });
  });
}

const WEEKDAYS = ["Ням", "Даваа", "Мягмар", "Лхагва", "Пүрэв", "Баасан", "Бямба"];

function mnDate(d: Date) {
  const ub = new Date(d.getTime() + 8 * 3600 * 1000); // УБ = UTC+8
  return `${ub.getUTCFullYear()} оны ${ub.getUTCMonth() + 1}-р сарын ${ub.getUTCDate()}, ${WEEKDAYS[ub.getUTCDay()]}`;
}

export function PunchCard({ isWorking, checkInAt, allowTrip }: Props) {
  const [state, action, pending] = useActionState(punch, null);
  const [now, setNow] = useState<Date | null>(null);
  const [trip, setTrip] = useState(false);
  const [selfie, setSelfie] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [geoHelp, setGeoHelp] = useState<ReturnType<typeof detectDevice> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const tick = () => setNow(new Date());
    const first = setTimeout(tick, 0);
    const t = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, []);

  async function onPickSelfie(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const blob = await compressImage(f);
      setSelfie(blob);
      setPreview(URL.createObjectURL(blob));
    } catch {
      setLocalError("Зургийг уншиж чадсангүй.");
    }
  }

  async function onPunch() {
    setLocalError(null);
    setGeoHelp(null);
    if (trip && !selfie) {
      fileRef.current?.click();
      return;
    }
    const fd = new FormData();
    fd.set("mode", trip ? "trip" : "normal");
    setLocating(true);
    try {
      const pos = await getPosition();
      fd.set("lat", String(pos.coords.latitude));
      fd.set("lng", String(pos.coords.longitude));
      fd.set("accuracy", String(pos.coords.accuracy));
    } catch (err) {
      // Wi-Fi-аар баталгаажих боломжтой тул байршилгүй ч илгээнэ
      const denied = (err as GeolocationPositionError)?.code === 1;
      if (denied) {
        setLocating(false);
        setGeoHelp(detectDevice(navigator.userAgent, navigator.maxTouchPoints));
        return;
      }
    }
    setLocating(false);
    if (trip && selfie) {
      fd.set("selfie", new File([selfie], "selfie.jpg", { type: "image/jpeg" }));
      // Нэг сельфиг дахин ашиглахгүй: дараагийн бүртгэлд шинээр авна
      setSelfie(null);
      setPreview(null);
    }
    startTransition(() => action(fd));
  }

  const busy = pending || locating;
  const elapsed =
    isWorking && checkInAt && now ? Math.max(0, Math.floor((now.getTime() - new Date(checkInAt).getTime()) / 60000)) : null;
  const clock = now
    ? new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Ulaanbaatar", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).format(now)
    : "--:--:--";
  const dateStr = now ? mnDate(now) : "";

  return (
    <section className="card text-center">
      <p className="text-4xl font-bold tabular-nums tracking-tight">{clock}</p>
      <p className="mb-4 text-xs text-gray-500">{dateStr}</p>

      <button
        onClick={onPunch}
        disabled={busy}
        className={`mx-auto flex h-40 w-40 flex-col items-center justify-center rounded-full text-white shadow-lg transition active:scale-95 disabled:opacity-60 ${
          isWorking ? "bg-gray-800" : "bg-brand"
        }`}
      >
        <span className="text-3xl">{isWorking ? "🏁" : "👆"}</span>
        <span className="mt-1 text-lg font-bold">{busy ? (locating ? "Байршил..." : "Илгээж байна") : isWorking ? "ЯВЛАА" : "ИРЛЭЭ"}</span>
        {trip && <span className="text-[11px] opacity-80">{selfie ? "сельфи бэлэн" : "сельфи авах"}</span>}
      </button>

      {elapsed != null && (
        <p className="mt-3 text-sm text-gray-600">
          Ажиллаж буй: <b>{Math.floor(elapsed / 60)}ц {elapsed % 60}м</b>
        </p>
      )}

      {allowTrip && (
        <label className="mt-4 flex items-center justify-center gap-2 text-sm">
          <input type="checkbox" checked={trip} onChange={(e) => setTrip(e.target.checked)} className="h-4 w-4 accent-brand" />
          Томилолт (сельфи + байршил)
        </label>
      )}
      <input ref={fileRef} type="file" accept="image/*" capture="user" className="hidden" onChange={onPickSelfie} />
      {preview && (
        <div className="mt-3 flex items-center justify-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Сельфи" className="h-16 w-16 rounded-full object-cover ring-2 ring-brand" />
          <button type="button" className="text-xs text-gray-500 underline" onClick={() => fileRef.current?.click()}>
            Дахин авах
          </button>
        </div>
      )}

      {geoHelp && <LocationHelp {...geoHelp} />}
      {!geoHelp && (localError || state) && (
        <p
          className={`mt-4 rounded-lg px-3 py-2 text-sm ${
            localError || !state?.ok ? "bg-brand-soft text-brand" : "bg-emerald-50 text-emerald-700"
          }`}
        >
          {localError ?? state?.message}
        </p>
      )}
    </section>
  );
}
