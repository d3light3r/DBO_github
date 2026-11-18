"use client";

import { Fragment, useEffect, useState } from "react";
import { BROWSER_NAMES, detectDevice, type Browser, type Platform } from "@/lib/device-detect";

// Алхмын текстэд [[...]] доторх үг нь утсан дээрх товч/цэсний яг нэр (тодруулж харуулна)
type Guide = { title: string; steps: string[]; extra?: { title: string; steps: string[] }; note?: string };

function guide(platform: Platform, browser: Browser): Guide {
  const b = BROWSER_NAMES[browser];
  const safari = browser === "safari" || browser === "other";
  switch (platform) {
    case "ios":
      return {
        title: "iPhone / iPad дээр байршил асаах",
        steps: [
          "Нүүр дэлгэцээс саарал араа ⚙️ дүрстэй [[Settings]] (Тохиргоо) апп-ыг нээнэ.",
          "Доош гүйлгээд цэнхэр гар ✋ дүрстэй [[Privacy & Security]] дээр дарна.",
          "Хамгийн дээд мөр [[Location Services]] дээр дарна. Дараагийн хуудасны дээд талын товч ногоон 🟢 байх ёстой (саарал бол дарж асаана).",
          safari
            ? "Мөн тэр хуудсыг доош гүйлгээд, апп-уудын жагсаалтаас (S үсэг дээр) [[Safari Websites]] дарна."
            : `Мөн тэр хуудсыг доош гүйлгээд, апп-уудын жагсаалтаас [[${b}]] дарна.`,
          "[[While Using the App]] дээр дарж ✓ тэмдэг гаргана. Доор нь байгаа [[Precise Location]] товчийг ногоон 🟢 болгоно.",
          `${safari ? "Safari" : b} руу буцаж ороод хуудсаа дахин ачаална (хаягийн мөрний ↻ дүрс).`,
          "«ИРЛЭЭ» дарахад «...would like to use your current location» гэж асуувал [[Allow]] дарна.",
        ],
        extra: safari
          ? {
              title: "Дээрхийг хийсэн ч ажиллахгүй бол (Safari-ийн сайтын тохиргоо)",
              steps: [
                "Safari-д энэ хуудсыг нээгээд хаягийн мөрний зүүн талын [[aA]] эсвэл 📄 дүрс дээр дарна.",
                "Гарч ирэх цэсний баруун доод [[•••]] товч → [[Website Settings]] дарна.",
                "[[Location]] → [[Allow]] сонгоод [[Done]] дарна.",
              ],
            }
          : undefined,
        note: "Нүүр дэлгэцэнд суулгасан апп ч Safari Websites-ийн тохиргоог ашиглана.",
      };
    case "android":
      return {
        title: "Android утсан дээр байршил асаах",
        steps: [
          "Дэлгэцийн дээд ирмэгээс доош 2 удаа татаж, 📍 [[Location]] (Байршил) товчийг асаана (өнгөтэй болно).",
          `${b} дээр энэ хуудсыг нээгээд хаягийн мөрний зүүн талын ⚙ эсвэл 🔒 дүрс дээр дарна.`,
          "[[Permissions]] (Зөвшөөрөл) → [[Location]] (Байршил) → [[Allow]] (Зөвшөөрөх) сонгоно.",
          "Хуудсаа дахин ачаалаад «ИРЛЭЭ» дарна.",
        ],
        extra: {
          title: `${b} өөрөө байршилгүй гэвэл`,
          steps: [
            "Утасны ⚙️ [[Settings]] (Тохиргоо) → [[Apps]] (Апп) → [[" + b + "]] дарна.",
            "[[Permissions]] → [[Location]] → [[Allow only while using the app]] сонгоно.",
            "[[Use precise location]] (Нарийн байршил) товчийг асаана.",
          ],
        },
      };
    case "windows":
      return {
        title: "Windows компьютер дээр байршил асаах",
        steps: [
          `${b}-ийн хаягийн мөрний зүүн талын 🔒 эсвэл ⚙ дүрс дээр дарна.`,
          "[[Location]] (Байршил) → [[Allow]] (Зөвшөөрөх) сонгоно. Харагдахгүй бол [[Site settings]] → [[Location]] → [[Allow]].",
          "Windows: [[Start]] ⊞ → ⚙️ [[Settings]] → [[Privacy & security]] → [[Location]] дарна.",
          "[[Location services]], [[Let apps access your location]], [[Let desktop apps access your location]] гурвыг асаана (On).",
          "Хуудсаа F5 дарж дахин ачаалаад «ИРЛЭЭ» дарна.",
        ],
        note: "Компьютерийн байршлыг Wi-Fi-аар тодорхойлдог тул алдаа их байж болно. Утаснаасаа бүртгүүлэхийг зөвлөж байна.",
      };
    case "mac":
      return {
        title: "Mac компьютер дээр байршил асаах",
        steps: [
          browser === "safari"
            ? "Дээд цэсний [[Safari]] → [[Settings…]] → [[Websites]] таб → зүүн жагсаалтын [[Location]] → энэ сайтыг [[Allow]] болгоно."
            : `${b}-ийн хаягийн мөрний зүүн талын дүрс → [[Location]] → [[Allow]].`,
          "Дээд зүүн буланд  → [[System Settings]] → [[Privacy & Security]] → [[Location Services]] дарна.",
          `[[Location Services]]-ийг асааж, жагсаалтаас [[${browser === "safari" ? "Safari" : b}]]-ийг асаана.`,
          "Хуудсаа дахин ачаалаад «ИРЛЭЭ» дарна.",
        ],
        note: "Компьютерийн байршлыг Wi-Fi-аар тодорхойлдог тул алдаа их байж болно. Утаснаасаа бүртгүүлэхийг зөвлөж байна.",
      };
    default:
      return {
        title: "Байршил асаах",
        steps: [
          "Хөтчийн хаягийн мөрний зүүн талын дүрс → [[Location]] (Байршил) → [[Allow]] (Зөвшөөрөх).",
          "Төхөөрөмжийн тохиргооноос байршлын үйлчилгээг асаана.",
          "Хуудсаа дахин ачаалаад «ИРЛЭЭ» дарна.",
        ],
      };
  }
}

/** "[[Settings]] дарна" → Settings-ийг товч шиг тодруулна */
function Rich({ text }: { text: string }) {
  const parts = text.split(/\[\[(.+?)\]\]/g);
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <b key={i} className="mx-0.5 inline-block rounded-md bg-white px-1.5 py-0.5 font-semibold text-gray-900 ring-1 ring-gray-300">
            {p}
          </b>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </>
  );
}

function Steps({ steps }: { steps: string[] }) {
  return (
    <ol className="mt-2 space-y-2">
      {steps.map((t, i) => (
        <li key={i} className="flex gap-2 leading-relaxed">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand text-[11px] font-bold text-white">{i + 1}</span>
          <span><Rich text={t} /></span>
        </li>
      ))}
    </ol>
  );
}

/** Төхөөрөмжид тохирсон байршил асаах заавар */
export function LocationHelp({
  platform,
  browser,
  denied = true,
}: {
  platform: Platform;
  browser: Browser;
  denied?: boolean;
}) {
  const g = guide(platform, browser);
  return (
    <div className={`mt-4 rounded-xl px-4 py-3 text-left text-sm text-gray-700 ${denied ? "bg-brand-soft" : "bg-gray-50"}`}>
      {denied && <p className="font-semibold text-brand">📍 Байршлын зөвшөөрөл өгөөгүй байна</p>}
      <p className="mt-1 font-semibold text-gray-900">{g.title}</p>
      <Steps steps={g.steps} />
      {g.extra && (
        <details className="mt-3">
          <summary className="cursor-pointer text-xs font-medium text-gray-600">{g.extra.title}</summary>
          <Steps steps={g.extra.steps} />
        </details>
      )}
      {g.note && <p className="mt-3 text-xs text-gray-500">{g.note}</p>}
      {denied && (
        <button type="button" onClick={() => location.reload()} className="btn-ghost mt-3 w-full text-xs">
          Тохируулсан, дахин ачаалах ↻
        </button>
      )}
    </div>
  );
}

/** Профайл хуудсанд: тухайн төхөөрөмжийн зааврыг үргэлж харуулна */
export function LocationHelpAuto() {
  const [dev, setDev] = useState<ReturnType<typeof detectDevice> | null>(null);
  useEffect(() => {
    const t = setTimeout(() => setDev(detectDevice(navigator.userAgent, navigator.maxTouchPoints)), 0);
    return () => clearTimeout(t);
  }, []);
  if (!dev) return null;
  return <LocationHelp {...dev} denied={false} />;
}
