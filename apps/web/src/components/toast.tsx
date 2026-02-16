"use client";

import type { ReactNode } from "react";
import { ToastContext, useToastState, type Toast } from "@/hooks/use-toast";

export function ToastProvider({ children }: { children: ReactNode }) {
  const state = useToastState();

  return (
    <ToastContext.Provider value={state}>
      {children}
      <ToastContainer toasts={state.toasts} onDismiss={state.dismiss} />
    </ToastContext.Provider>
  );
}

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`px-4 py-3 rounded-none text-[13px] font-medium flex items-center gap-2 animate-in slide-in-from-right ${
            toast.type === "success"
              ? "bg-[var(--success)] text-black"
              : "bg-[var(--error)] text-white"
          }`}
        >
          <span className="flex-1">{toast.message}</span>
          <button
            onClick={() => onDismiss(toast.id)}
            className="opacity-70 hover:opacity-100"
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  );
}
