import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import { connection } from "next/server";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { LangProvider } from "@/lib/i18n";
import { site } from "@/lib/site";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${site.name} — Tuition & coaching for every grade`,
    template: `%s · ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  openGraph: {
    type: "website",
    siteName: site.name,
    title: `${site.name} — Tuition & coaching for every grade`,
    description: site.description,
    locale: "en_IN",
    images: [{ url: "/logo.png", width: 480, height: 424, alt: site.name }],
  },
  robots: { index: true, follow: true },
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  themeColor: "#2b7010",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Render per request so the CSP nonce from proxy.ts is applied to every script.
  await connection();
  return (
    <html lang="en" className={outfit.variable}>
      <body className="min-h-dvh bg-white">
        <LangProvider>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-ink focus:px-5 focus:py-3 focus:text-white"
          >
            Skip to content
          </a>
          <Navbar />
          <main id="main">{children}</main>
          <Footer />
        </LangProvider>
      </body>
    </html>
  );
}
