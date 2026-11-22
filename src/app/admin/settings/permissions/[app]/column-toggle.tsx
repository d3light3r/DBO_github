"use client";

/** Баганын бүх (идэвхтэй) чагтыг нэг дор сонгох / арилгах */
export function ColumnToggle({ perm }: { perm: string }) {
  const set = (on: boolean) =>
    document.querySelectorAll<HTMLInputElement>(`input[data-perm="${perm}"]:not(:disabled)`).forEach((el) => {
      el.checked = on;
    });
  return (
    <span className="mt-1 flex justify-center gap-1 text-[10px] font-normal">
      <button type="button" className="text-brand hover:underline" onClick={() => set(true)}>бүгд</button>
      <span className="text-gray-300">|</span>
      <button type="button" className="text-gray-500 hover:underline" onClick={() => set(false)}>арилгах</button>
    </span>
  );
}
