"use client";

/** Чагтлахад маягтыг шууд илгээнэ (value: "on" | "off") */
export function AutoCheckbox({ name, checked, label }: { name: string; checked: boolean; label?: string }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
      <input type="hidden" name={name} value={checked ? "off" : "on"} />
      <input
        type="checkbox"
        defaultChecked={checked}
        className="h-4 w-4 accent-brand"
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        aria-label={label}
      />
      {label && <span>{label}</span>}
    </label>
  );
}
