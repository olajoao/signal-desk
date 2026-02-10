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
          className={`px-4 py-3 rounded-lg shadow-lg text-sm flex items-center gap-2 animate-in slide-in-from-right ${
            toast.type === "success"
              ? "bg-green-600 text-white"
              : "bg-red-600 text-white"
          }`}
        >
          <span className="flex-1">{toast.message}</span>
          <button
            onClick={() => onDismiss(toast.id)}
            className="text-white/70 hover:text-white"
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  );
}
