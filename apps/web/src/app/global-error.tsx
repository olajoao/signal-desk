"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);
  return (
    <html lang="en">
      <body className="antialiased bg-[#050505] text-[#e8e8e8]">
        <div className="flex h-screen items-center justify-center">
          <div className="text-center max-w-md">
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-[#737373] mb-4 text-sm">
              {error.digest ? "A critical error occurred." : (error.message || "A critical error occurred.")}
            </p>
            <button
              onClick={reset}
              className="bg-[#2dd4bf] text-black px-4 py-2 rounded font-medium hover:bg-[#14b8a6]"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
