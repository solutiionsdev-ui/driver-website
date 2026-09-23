import type { Metadata, Viewport } from "next";
import { Oswald, Space_Grotesk } from "next/font/google";

import {
  generateMetadata,
  generateViewport,
} from "@/utils/seo/generate-page-metadata";
import { getSiteStructuredData } from "@/utils/seo/structured-data";

import { AdaptiveGrid } from "@/components/common/grid";
import { ReducedMotion } from "@/components/common/reduced-motion";
import { ScrollLayout } from "@/layouts/scroll-layout";

import "@/app/globals.css";

/* The two faces the GRIDO1 hero frame is set in (Figma 823:247). */

/** Everything conversational — nav, meta rows, panel copy. `--font-sans`. */
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
});

/** Condensed display face — the driver name and the stat figures. */
const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = generateMetadata();
export const viewport: Viewport = generateViewport();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      {/* Extensions inject attributes onto <body> after the server HTML is
          sent (ColorZilla's `cz-shortcut-listen`, password managers, …), which
          React reports as a hydration mismatch on every load. The flag covers
          this element's attributes only — real mismatches inside the tree are
          still reported. */}
      <body
        suppressHydrationWarning
        className={`${spaceGrotesk.variable} ${oswald.variable} font-sans`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(getSiteStructuredData()),
          }}
        />
        <ScrollLayout>
          <AdaptiveGrid />
          <ReducedMotion />
          {children}
        </ScrollLayout>
      </body>
    </html>
  );
}
