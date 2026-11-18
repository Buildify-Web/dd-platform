import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import { connection } from "next/server";
import "./globals.css";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Dynamic Donalds · Admin & staff portal", template: "%s · Dynamic Donalds" },
  description: "Admin and staff portal for Dynamic Donalds.",
  applicationName: "Dynamic Donalds Portal",
  robots: { index: false, follow: false },
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  themeColor: "#e4e6df",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Render per request so the CSP nonce from proxy.ts is applied to every script.
  await connection();
  return (
    <html lang="en" className={outfit.variable}>
      <body className="min-h-dvh bg-canvas">{children}</body>
    </html>
  );
}
