import type { ReactNode } from "react";
import { Container } from "./ui";

/** Large uppercase call-to-action band shown above the footer on every page. */
export function CtaBand({ title, actions }: { title: ReactNode; actions: ReactNode }) {
  return (
    <section className="pt-20 md:pt-24">
      <Container className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <h2 className="display max-w-[62rem] text-[clamp(1.95rem,9vw,2.3rem)] text-ink sm:text-5xl lg:text-[3.6rem]">{title}</h2>
        <div className="flex flex-wrap items-center gap-3 lg:pb-2">{actions}</div>
      </Container>
    </section>
  );
}
