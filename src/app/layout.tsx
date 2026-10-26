import type { Metadata, Viewport } from "next";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/public-sans";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { config } from "@/lib/config";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL(config.appUrl),
  title: {
    default: `${config.appName}: book safaris, mokoro trips and tours across Botswana`,
    template: `%s | ${config.appName}`,
  },
  description:
    "Book game drives, mokoro trips, scenic flights, boat cruises and cultural experiences directly with licensed local operators across Botswana.",
  openGraph: { type: "website", siteName: config.appName },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#1f5e8c",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-paper focus:p-3">
          Skip to content
        </a>
        <Header />
        <main id="main" className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
