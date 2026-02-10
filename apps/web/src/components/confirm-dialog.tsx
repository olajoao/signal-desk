"use client";

import { useRef, useEffect } from "react";

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
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onCancel}
      className="bg-[var(--card)] text-white border border-[var(--border)] rounded-lg p-6 max-w-sm w-full backdrop:bg-black/50"
    >
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-gray-400 mb-4">{description}</p>
      <div className="flex gap-2 justify-end">
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded border border-[var(--border)] text-sm hover:bg-white/5"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className={`px-4 py-2 rounded text-sm text-white ${
            destructive
              ? "bg-red-600 hover:bg-red-700"
              : "bg-[var(--primary)] hover:bg-[var(--primary)]/80"
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
