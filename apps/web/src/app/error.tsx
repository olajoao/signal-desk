"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function Error({
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
    <div className="flex h-screen items-center justify-center">
      <div className="text-center max-w-md">
        <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
        <p className="text-gray-400 mb-4 text-sm">
          {error.digest ? "An unexpected error occurred." : (error.message || "An unexpected error occurred.")}
        </p>
        <button
          onClick={reset}
          className="bg-[var(--primary)] text-white px-4 py-2 rounded hover:bg-[var(--primary)]/80"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
