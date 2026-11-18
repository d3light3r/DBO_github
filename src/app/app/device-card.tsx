"use client";

import { useActionState } from "react";
import { registerDevice } from "./actions";

type Kind = "unregistered" | "pending" | "other_employee";

const TEXT: Record<Kind, { title: string; body: string }> = {
  unregistered: {
    title: "Энэ утас бүртгэлгүй байна",
    body: "Цаг бүртгүүлэхийн тулд энэ утсаа бүртгүүлж, админаар батлуулна уу. Нэг ажилтан нэг утаснаас л бүртгүүлнэ.",
  },
  pending: {
    title: "Админ батлахыг хүлээж байна",
    body: "Таны утасны бүртгэлийн хүсэлт илгээгдсэн. Админ баталмагц цаг бүртгүүлэх боломжтой болно.",
  },
  other_employee: {
    title: "Энэ утас өөр ажилтанд бүртгэлтэй",
    body: "Өөрийн утаснаасаа нэвтэрнэ үү. Утсаа сольсон бол админд хандана уу.",
  },
};

export function DeviceCard({ kind }: { kind: Kind }) {
  const [state, action, pending] = useActionState(registerDevice, null);
  const t = TEXT[kind];
  return (
    <section className="card border-l-4 border-amber-400">
      <h2 className="text-sm font-semibold">📱 {t.title}</h2>
      <p className="mt-1 text-sm text-gray-600">{t.body}</p>
      {kind === "unregistered" && !state?.ok && (
        <form action={action} className="mt-3">
          <button className="btn-primary w-full" disabled={pending}>
            {pending ? "Илгээж байна..." : "Энэ утсыг бүртгүүлэх"}
          </button>
        </form>
      )}
      {state && (
        <p className={`mt-2 text-sm ${state.ok ? "text-emerald-700" : "text-brand"}`}>{state.message}</p>
      )}
      <p className="mt-2 text-xs text-gray-400">
        Санамж: iPhone дээр Safari болон нүүр дэлгэцэнд суулгасан апп нь тусдаа төхөөрөмж гэж тооцогдоно. Цаг бүртгүүлэх газраасаа бүртгүүлээрэй.
      </p>
    </section>
  );
}
