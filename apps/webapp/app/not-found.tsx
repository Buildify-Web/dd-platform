import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center p-6 text-center">
      <div>
        <p className="text-[12px] uppercase tracking-[0.2em] text-muted">404</p>
        <h1 className="mt-2 text-3xl font-normal">This page doesn&rsquo;t exist</h1>
        <Link href="/" className="mt-6 inline-flex h-11 items-center rounded-[10px] bg-ink px-5 text-[15px] text-white hover:bg-[#223a17]">
          Go to the portal
        </Link>
      </div>
    </main>
  );
}
