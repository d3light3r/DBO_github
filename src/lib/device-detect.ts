// Төхөөрөмж, хөтчийг user agent-аас тодорхойлно. Сервер болон клиент хоёуланд ашиглана.

export type Platform = "ios" | "android" | "mac" | "windows" | "other";
export type Browser = "safari" | "chrome" | "edge" | "firefox" | "other";

export function detectDevice(ua: string, touchPoints = 0): { platform: Platform; browser: Browser } {
  // iPadOS нь өөрийгөө Mac гэж танилцуулдаг тул мэдрэгчтэй дэлгэцээр ялгана
  const isIOS = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && touchPoints > 1);
  const platform: Platform = isIOS
    ? "ios"
    : /Android/.test(ua)
      ? "android"
      : /Macintosh|Mac OS X/.test(ua)
        ? "mac"
        : /Windows/.test(ua)
          ? "windows"
          : "other";
  const browser: Browser = /Edg\//.test(ua)
    ? "edge"
    : /CriOS|Chrome\//.test(ua)
      ? "chrome"
      : /FxiOS|Firefox\//.test(ua)
        ? "firefox"
        : /Safari\//.test(ua)
          ? "safari"
          : "other";
  return { platform, browser };
}

export const PLATFORM_NAMES: Record<Platform, string> = {
  ios: "iPhone/iPad",
  android: "Android",
  mac: "Mac",
  windows: "Windows",
  other: "Төхөөрөмж",
};

export const BROWSER_NAMES: Record<Browser, string> = {
  safari: "Safari",
  chrome: "Chrome",
  edge: "Edge",
  firefox: "Firefox",
  other: "хөтөч",
};

/** "iPhone/iPad · Safari" гэх мэт хүнд ойлгомжтой нэр */
export function deviceLabel(ua: string): string {
  // Сервер талд touchPoints мэдэгдэхгүй тул iPad-ийг Mac гэж харуулж болно
  const { platform, browser } = detectDevice(ua);
  return `${PLATFORM_NAMES[platform]} · ${BROWSER_NAMES[browser]}`;
}
