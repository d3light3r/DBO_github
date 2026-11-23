/** Цэс солиход шууд харагдах ачаалж буй загвар (loading.tsx) — хуудас серверээс ирэх хүртэл */
export function PageLoading() {
  return (
    <div className="animate-pulse space-y-4" aria-busy="true" aria-label="Ачаалж байна">
      <div className="h-7 w-48 rounded-lg bg-gray-200" />
      <div className="h-4 w-72 max-w-full rounded bg-gray-200" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="card h-24" />
        ))}
      </div>
      <div className="card h-64" />
    </div>
  );
}
