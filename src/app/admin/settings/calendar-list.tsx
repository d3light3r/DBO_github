import { fmtDate, todayUB } from "@/lib/time";
import { ConfirmButton } from "@/components/confirm-button";

type Item = { id: string; date: string; name: string };

/** Баярын болон ажлын өдрийн жагсаалт (нэмэх, устгах) */
export function CalendarList({
  title,
  description,
  placeholder,
  items,
  addAction,
  deleteAction,
}: {
  title: string;
  description: string;
  placeholder: string;
  items: Item[];
  addAction: (f: FormData) => Promise<void>;
  deleteAction: (f: FormData) => Promise<void>;
}) {
  const today = todayUB();
  const upcoming = items.filter((i) => i.date >= today);
  const past = items.filter((i) => i.date < today).reverse();

  const list = (rows: Item[], dim = false) => (
    <ul className={`divide-y divide-gray-100 text-sm ${dim ? "text-gray-400" : ""}`}>
      {rows.map((h) => (
        <li key={h.id} className="flex items-center justify-between py-1.5">
          <span>{fmtDate(h.date)} · {h.name}</span>
          <form action={deleteAction}>
            <input type="hidden" name="id" value={h.id} />
            <ConfirmButton message={`${fmtDate(h.date)} «${h.name}»-г устгах уу?`}>Устгах</ConfirmButton>
          </form>
        </li>
      ))}
    </ul>
  );

  return (
    <section className="card max-w-2xl space-y-4">
      <div>
        <h2 className="font-semibold">{title}</h2>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      <form action={addAction} className="flex flex-wrap gap-2">
        <input type="date" name="date" className="input w-auto" required />
        <input name="name" className="input w-auto flex-1" placeholder={placeholder} required />
        <button className="btn-primary">Нэмэх</button>
      </form>
      {upcoming.length > 0 ? list(upcoming) : <p className="text-sm text-gray-400">Удахгүй болох өдөр алга</p>}
      {past.length > 0 && (
        <details>
          <summary className="cursor-pointer text-xs text-gray-500">Өнгөрсөн ({past.length})</summary>
          {list(past, true)}
        </details>
      )}
    </section>
  );
}
