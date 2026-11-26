"use client";

import { useEffect, type ReactNode } from "react";
import { CloseIcon } from "./icons";

/** Bottom sheet on phones, centered card on wide screens. */
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="sheet max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl dark:bg-slate-900 sm:rounded-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="-m-2 p-2 text-slate-500">
            <CloseIcon />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function SheetButton({
  children,
  onClick,
  tone = "default",
}: {
  children: ReactNode;
  onClick: () => void;
  tone?: "default" | "primary" | "danger";
}) {
  const tones = {
    default: "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100",
    primary: "bg-blue-600 text-white",
    danger: "bg-red-600 text-white",
  };
  return (
    <button type="button" onClick={onClick} className={`w-full rounded-xl px-4 py-3.5 text-left font-semibold active:scale-[0.99] ${tones[tone]}`}>
      {children}
    </button>
  );
}
