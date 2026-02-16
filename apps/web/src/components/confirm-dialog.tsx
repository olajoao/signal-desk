"use client";

import { useEffect, useCallback, useState } from "react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  onConfirm,
  onCancel,
  destructive,
}: ConfirmDialogProps) {
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (open) {
      setVisible(true);
      requestAnimationFrame(() => setAnimating(true));
    } else {
      setAnimating(false);
      const timeout = setTimeout(() => setVisible(false), 150);
      return () => clearTimeout(timeout);
    }
  }, [open]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    },
    [onCancel]
  );

  useEffect(() => {
    if (visible) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [visible, handleKeyDown]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className={`absolute inset-0 bg-black/60 transition-opacity duration-150 ${
          animating ? "opacity-100" : "opacity-0"
        }`}
        onClick={onCancel}
      />
      <div
        className={`relative bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl transition-all duration-150 ${
          animating
            ? "opacity-100 scale-100 translate-y-0"
            : "opacity-0 scale-95 translate-y-2"
        }`}
      >
        <h3 className="font-semibold text-lg mb-1">{title}</h3>
        <p className="text-sm text-gray-400 mb-5">{description}</p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-[var(--border)] text-sm hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg text-sm text-white transition-colors ${
              destructive
                ? "bg-red-600 hover:bg-red-700"
                : "bg-[var(--primary)] hover:bg-[var(--primary)]/80"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
