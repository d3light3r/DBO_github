"use client";

import { BROWSER_NAMES, type Browser, type Platform } from "@/lib/device-detect";

function steps(platform: Platform, browser: Browser): { title: string; items: string[]; note?: string } {
  const b = BROWSER_NAMES[browser];
  switch (platform) {
    case "ios":
      return {
        title: "iPhone дээр байршил асаах",
        items: [
          "Settings (Тохиргоо) → Privacy & Security → Location Services-ийг асаана.",
          browser === "safari" || browser === "other"
            ? "Мөн тэр жагсаалтаас Safari Websites → While Using the App сонгож, Precise Location-ийг асаана."
            : `Мөн тэр жагсаалтаас ${b} → While Using the App сонгож, Precise Location-ийг асаана.`,
          browser === "safari" || browser === "other"
            ? "Safari-д буцаж ороод хаягийн мөрний «aA» дүрс → Website Settings → Location → Allow."
            : `${b}-д буцаж ороод хуудсаа дахин ачаална.`,
          "Хуудсаа дахин ачаалаад «Ирлээ» товчийг дарж, асуухад Allow дарна.",
        ],
      };
    case "android":
      return {
        title: "Android утсан дээр байршил асаах",
        items: [
          "Дэлгэцийн дээд хэсгийг доош татаж «Байршил» (Location)-ийг асаана.",
          `${b}-ийн хаягийн мөрний зүүн талын 🔒 дүрс → Зөвшөөрөл (Permissions) → Байршил → Зөвшөөрөх.`,
          `Хэрэв харагдахгүй бол: Тохиргоо → Апп → ${b} → Зөвшөөрөл → Байршил → «Апп ашиглах үед зөвшөөрөх».`,
          "Хуудсаа дахин ачаалаад «Ирлээ» товчийг дарна.",
        ],
      };
    case "windows":
      return {
        title: "Компьютер (Windows) дээр байршил асаах",
        items: [
          `${b}-ийн хаягийн мөрний зүүн талын дүрс (🔒 эсвэл ⚙) → Байршил (Location) → Зөвшөөрөх (Allow).`,
          "Windows Settings → Privacy & security → Location → Location services-ийг асаана.",
          "Хуудсаа дахин ачаалаад «Ирлээ» товчийг дарна.",
        ],
        note: "Компьютерийн байршил Wi-Fi-аар тодорхойлогддог тул нарийвчлал муу байж болно. Боломжтой бол утаснаасаа бүртгүүлнэ үү.",
      };
    case "mac":
      return {
        title: "Mac компьютер дээр байршил асаах",
        items: [
          browser === "safari"
            ? "Safari цэс → Settings → Websites → Location → энэ сайтыг Allow болгоно."
            : `${b}-ийн хаягийн мөрний зүүн талын дүрс → Location → Allow.`,
          `System Settings → Privacy & Security → Location Services-ийг асааж, ${b}-ийг зөвшөөрнө.`,
          "Хуудсаа дахин ачаалаад «Ирлээ» товчийг дарна.",
        ],
        note: "Компьютерийн байршил Wi-Fi-аар тодорхойлогддог тул нарийвчлал муу байж болно. Боломжтой бол утаснаасаа бүртгүүлнэ үү.",
      };
    default:
      return {
        title: "Байршил асаах",
        items: [
          "Хөтчийн хаягийн мөрний зүүн талын дүрс → Байршил (Location) → Зөвшөөрөх.",
          "Төхөөрөмжийн тохиргооноос байршлын үйлчилгээг асаана.",
          "Хуудсаа дахин ачаалаад «Ирлээ» товчийг дарна.",
        ],
      };
  }
}

/** Байршлын зөвшөөрөл өгөөгүй үед төхөөрөмжид тохирсон заавар */
export function LocationHelp({ platform, browser }: { platform: Platform; browser: Browser }) {
  const s = steps(platform, browser);
  return (
    <div className="mt-4 rounded-lg bg-brand-soft px-4 py-3 text-left text-sm text-brand">
      <p className="font-semibold">Байршлын зөвшөөрөл өгөөгүй байна</p>
      <p className="mt-2 font-medium text-gray-800">{s.title}:</p>
      <ol className="mt-1 list-decimal space-y-1 pl-5 text-gray-700">
        {s.items.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ol>
      {s.note && <p className="mt-2 text-xs text-gray-500">{s.note}</p>}
      <button type="button" onClick={() => location.reload()} className="btn-ghost mt-3 w-full text-xs">
        Тохируулсан, дахин ачаалах
      </button>
    </div>
  );
}
