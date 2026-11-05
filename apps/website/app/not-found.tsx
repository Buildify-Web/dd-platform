import { HeroFrame } from "@/components/HeroFrame";
import { PillButton } from "@/components/ui";

export default function NotFound() {
  return (
    <HeroFrame>
      <div className="mx-auto max-w-xl px-5 pb-24 pt-20 text-center">
        <p className="eyebrow">404</p>
        <h1 className="display mt-6 text-5xl text-ink md:text-6xl">
          Page <span className="text-brand">not</span> <span className="text-sun">found</span>
        </h1>
        <p className="mx-auto mt-5 max-w-sm text-sm text-ink-soft">
          The page you’re looking for doesn’t exist or has moved.
        </p>
        <div className="mt-8 flex justify-center">
          <PillButton href="/">Back to home</PillButton>
        </div>
      </div>
    </HeroFrame>
  );
}
