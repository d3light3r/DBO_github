// Апп-ыг утсанд суулгах (PWA) боломжийг идэвхжүүлэх энгийн service worker.
// Ирцийн өгөгдөл үргэлж сервэрээс шууд авна, кэшлэхгүй.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
