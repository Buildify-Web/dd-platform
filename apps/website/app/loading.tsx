/** Instant placeholder shown while the next page renders on the server (navbar stays visible). */
export default function Loading() {
  return (
    <div className="px-2 pt-2 md:px-2.5 md:pt-2.5" aria-busy="true" aria-label="Loading">
      <div className="relative h-[520px] overflow-hidden rounded-[1.25rem] bg-mist">
        <div className="mx-auto mt-[140px] max-w-[720px] space-y-4 px-5">
          <div className="h-3 w-20 animate-pulse rounded-full bg-white/70" />
          <div className="h-14 w-full animate-pulse rounded-2xl bg-white/70" />
          <div className="h-14 w-3/4 animate-pulse rounded-2xl bg-white/70" />
          <div className="h-4 w-1/2 animate-pulse rounded-full bg-white/60" />
        </div>
      </div>
    </div>
  );
}
