"use client";

import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Only the digest is surfaced; server error details are never sent to the browser in production.
    console.error(error.digest ?? "Unexpected error");
  }, [error]);

  return (
    <div className="mx-auto max-w-xl px-5 py-24 text-center">
      <h1 className="display text-4xl text-ink">Something went wrong</h1>
      <p className="mt-4 text-sm text-ink-soft">Please try again in a moment.</p>
      <button
        type="button"
        onClick={reset}
        className="btn-gloss mt-8 rounded-full bg-ink px-6 py-3 text-sm text-white hover:bg-brand"
      >
        Try again
      </button>
    </div>
  );
}
