"use client";

import { IWarn } from "@/components/portal/icons";
import { btn } from "@/components/ui/kit";

/** Friendly retry screen for any portal page that fails to load. */
export default function PortalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="grid min-h-[50vh] place-items-center rounded-[18px] border border-line bg-white p-8 text-center">
      <div>
        <span className="mx-auto mb-3 grid size-12 place-items-center rounded-2xl bg-sun-soft text-ink">
          <IWarn className="size-5" />
        </span>
        <h1 className="text-[20px] font-normal">This page didn&rsquo;t load</h1>
        <p className="mt-1 text-[14px] text-muted">The server may be busy. Your data is safe. Try again in a moment.</p>
        <button type="button" onClick={reset} className={`${btn.dark} mt-5`}>
          Try again
        </button>
      </div>
    </div>
  );
}
