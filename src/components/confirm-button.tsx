"use client";

/** Устгах зэрэг буцаах боломжгүй үйлдлийн өмнө баталгаажуулалт асууна */
export function ConfirmButton({
  message,
  children,
  className = "text-xs text-gray-400 hover:text-brand",
}: {
  message: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      className={className}
      onClick={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
