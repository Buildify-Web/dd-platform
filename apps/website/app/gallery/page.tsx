import type { Metadata } from "next";
import { HeroFrame, PageHero } from "@/components/HeroFrame";
import { Container } from "@/components/ui";
import { galleryItems } from "@/content/gallery";
import { GalleryGrid } from "./GalleryGrid";

export const metadata: Metadata = {
  title: "Gallery",
  description: "Classes, competitions and celebrations at Dynamic Donalds.",
};

export default function GalleryPage() {
  return (
    <>
      <HeroFrame>
        <PageHero
          eyebrow="Gallery"
          title={
            <>
              <span className="text-brand">Moments</span> from
              <br />
              our <span className="text-sun">classrooms</span>
            </>
          }
        >
          Classes, competitions and celebrations at Dynamic Donalds.
        </PageHero>
      </HeroFrame>

      <section className="pt-16 md:pt-20">
        <Container>
          <GalleryGrid items={galleryItems} />
        </Container>
      </section>
    </>
  );
}
