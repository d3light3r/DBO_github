import { requirePerm } from "@/lib/auth";
import { UndoForm } from "../talon-forms";

/** Алдаа засах: зарсан / салбарт оруулсан бүртгэлийг буцаах */
export default async function TalonUndoPage() {
  await requirePerm("talon.undo", "/talon");
  return (
    <div className="max-w-2xl">
      <UndoForm />
    </div>
  );
}
