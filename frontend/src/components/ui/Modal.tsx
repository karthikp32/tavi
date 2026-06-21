"use client";

import type { ReactNode } from "react";

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({ title, onClose, children }: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-tavi-navy/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-tavi-navy">{title}</h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="text-tavi-navy/50 hover:text-tavi-navy"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
