import { getCurrentEmployee } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/types";
import { signOut } from "@/app/app/actions";
import { PasswordForm } from "./password-form";
import { LocationHelpAuto } from "@/app/app/location-help";

export default async function ProfilePage() {
  const emp = await getCurrentEmployee();
  return (
    <div className="space-y-4">
      <section className="card text-sm">
        <dl className="grid grid-cols-2 gap-y-1">
          <dt className="text-gray-500">Нэр</dt><dd className="text-right">{emp.full_name}</dd>
          <dt className="text-gray-500">Код</dt><dd className="text-right">{emp.emp_code}</dd>
          <dt className="text-gray-500">Утас</dt><dd className="text-right">{emp.phone}</dd>
          <dt className="text-gray-500">Эрх</dt><dd className="text-right">{ROLE_LABELS[emp.role]}</dd>
        </dl>
      </section>
      <PasswordForm />
      <details className="card text-sm">
        <summary className="cursor-pointer font-semibold">📍 Байршил асаах заавар</summary>
        <LocationHelpAuto />
      </details>
      <section className="card text-sm text-gray-600">
        <h2 className="mb-1 font-semibold text-gray-900">Утсандаа суулгах</h2>
        <p><b>iPhone:</b> Safari-гаар нээгээд доод талын &quot;Share&quot; товч → &quot;Add to Home Screen&quot;.</p>
        <p className="mt-1"><b>Android:</b> Chrome-оор нээгээд баруун дээд ⋮ цэс → &quot;Install app&quot; эсвэл &quot;Add to Home screen&quot;.</p>
      </section>
      <form action={signOut}>
        <button className="btn-ghost w-full">Гарах</button>
      </form>
    </div>
  );
}
