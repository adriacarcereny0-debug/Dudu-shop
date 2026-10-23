"use client";

import { useCallback, useRef, useState } from "react";

export function useToast() {
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const show = useCallback((text: string, error = false) => {
    clearTimeout(timer.current);
    setMessage({ text, error });
    timer.current = setTimeout(() => setMessage(null), error ? 4500 : 2200);
  }, []);

  const toast = message ? (
    <div
      role="status"
      className={`fixed inset-x-4 bottom-24 z-50 mx-auto max-w-sm rounded-2xl px-4 py-3 text-center text-sm font-semibold shadow-lg ${
        message.error ? "bg-danger text-white" : "bg-ink text-paper"
      }`}
    >
      {message.text}
    </div>
  ) : null;

  return { show, toast };
}
