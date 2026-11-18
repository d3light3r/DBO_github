import { fmtDate, todayUB } from "@/lib/time";
import { ConfirmButton } from "@/components/confirm-button";
import { Icon } from "@/components/icons";
import { Modal } from "@/components/modal";

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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex-1">
          <h2 className="font-semibold">{title}</h2>
          <p className="text-xs text-gray-500">{description}</p>
        </div>
        <Modal label={<><Icon name="plus" /> Нэмэх</>} title={title} closeOnSubmit>
          <form action={addAction} className="space-y-3">
            <div><label className="label">Огноо</label><input type="date" name="date" className="input" required /></div>
            <div><label className="label">Нэр</label><input name="name" className="input" placeholder={placeholder} required /></div>
            <button className="btn-primary w-full">Нэмэх</button>
          </form>
        </Modal>
      </div>
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
