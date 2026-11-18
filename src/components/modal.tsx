"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Icon } from "./icons";

/**
 * "＋ Нэмэх" товч дарахад нээгддэг цонх.
 * closeHref: засах горимд (?edit=...) хаахад шилжих хаяг. closeOnSubmit: энгийн маягтыг илгээмэгц хаана.
 */
export function Modal({
  label,
  title,
  children,
  defaultOpen = false,
  closeHref,
  closeOnSubmit = false,
  buttonClassName = "btn-primary",
}: {
  label: React.ReactNode;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  closeHref?: string;
  closeOnSubmit?: boolean;
  buttonClassName?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (defaultOpen && ref.current && !ref.current.open) ref.current.showModal();
  }, [defaultOpen]);

  const close = () => ref.current?.close();

  return (
    <>
      <button type="button" className={buttonClassName} onClick={() => ref.current?.showModal()}>
        {label}
      </button>
      <dialog
        ref={ref}
        className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl bg-transparent p-0 backdrop:bg-gray-900/40"
        onClick={(e) => {
          if (e.target === ref.current) close(); // гадна дарвал хаана
        }}
        onSubmit={() => {
          if (closeOnSubmit) setTimeout(close, 50);
        }}
      >
        <div className="max-h-[85dvh] overflow-y-auto rounded-2xl bg-white p-4 shadow-xl">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">{title}</h2>
            {closeHref ? (
              <Link href={closeHref} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100" aria-label="Хаах">
                <Icon name="x" className="h-5 w-5" />
              </Link>
            ) : (
              <button type="button" onClick={close} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100" aria-label="Хаах">
                <Icon name="x" className="h-5 w-5" />
              </button>
            )}
          </div>
          {children}
        </div>
      </dialog>
    </>
  );
}
