"use client";

import { createContext, useContext, useState, useCallback } from "react";

type ToastType = "success" | "error" | "info";

type Toast = {
  id: string;
  message: string;
  type: ToastType;
};

type ToastContextType = {
  toasts: Toast[];
  showToast: (message: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextType>({
  toasts: [],
  showToast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "success") => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, showToast }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`animate-slide-up rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg transition-all ${
              toast.type === "success"
                ? "bg-green-500"
                : toast.type === "error"
                  ? "bg-red-500"
                  : "bg-blue-500"
            }`}
          >
            <div className="flex items-center gap-2">
              {toast.type === "success" && (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
              {toast.type === "error" && (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              {toast.type === "info" && (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              {toast.message}
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
