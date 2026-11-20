"use client";

import { useMemo, useState } from "react";
import { nameKey } from "@/lib/customer-import";

export type PickerCustomer = { id: string; name: string; register: string | null };

const label = (c: PickerCustomer) => (c.name ? `${c.name}${c.register ? ` · ${c.register}` : ""}` : c.register ?? "—");

/** Харилцагчийг нэр эсвэл регистрээр бичиж хайгаад сонгоно. Сонгосон id-г `name` нэртэй нуугдмал талбарт илгээнэ. */
export function CustomerPicker({ customers, name = "customer_id" }: { customers: PickerCustomer[]; name?: string }) {
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<PickerCustomer | null>(null);
  const [open, setOpen] = useState(false);

  const matches = useMemo(() => {
    const k = nameKey(q);
    if (!k) return customers.slice(0, 30);
    return customers
      .filter((c) => nameKey(c.name ?? "").includes(k) || nameKey(c.register ?? "").includes(k))
      .slice(0, 30);
  }, [q, customers]);

  return (
    <div className="relative">
      <input type="hidden" name={name} value={picked?.id ?? ""} />
      {picked ? (
        <div className="input flex items-center justify-between gap-2 bg-gray-50">
          <span className="truncate font-medium">{label(picked)}</span>
          <button type="button" className="text-xs text-brand" onClick={() => { setPicked(null); setQ(""); setOpen(true); }}>Солих</button>
        </div>
      ) : (
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (matches[0]) { setPicked(matches[0]); setOpen(false); }
            }
          }}
          className="input"
          placeholder="Нэр эсвэл регистрээр хайх..."
          autoComplete="off"
        />
      )}
      {open && !picked && (
        <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg bg-white py-1 text-sm shadow-lg ring-1 ring-gray-200">
          {matches.map((c) => (
            <li key={c.id}>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { setPicked(c); setOpen(false); }}
                className="block w-full px-3 py-1.5 text-left hover:bg-gray-50">
                {c.name || <span className="text-gray-400">(нэргүй)</span>}
                {c.register && <span className="ml-2 font-mono text-xs text-gray-500">{c.register}</span>}
              </button>
            </li>
          ))}
          {matches.length === 0 && <li className="px-3 py-2 text-gray-400">Олдсонгүй</li>}
        </ul>
      )}
    </div>
  );
}
