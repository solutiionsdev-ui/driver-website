import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import {
  comingSoonCommon,
  comingSoonPages,
  type ComingSoonKey,
} from "@/data/mocks/coming-soon";
import { homeContent } from "@/data/mocks/home";
import { siteConfig } from "@/lib/site";
import { generateMetadata } from "@/utils/seo/generate-page-metadata";

import { ComingSoonTitle } from "./coming-soon-title";

export interface ComingSoonViewProps {
  page: ComingSoonKey;
}

const LINK =
  "whitespace-nowrap text-label font-bold uppercase leading-flat text-foreground transition-colors duration-[var(--duration-fast)] ease-entrance hover:text-accent";

/**
 * Placeholder for every route the design links to but the project has no
 * content for yet — journal, a story, store, garage, trailer, legal. Server
 * Component; only the headline's reveal is a client leaf.
 *
 * Kept out of the index (`noindex`) and out of the sitemap: an empty page is
 * not something to rank.
 */
export const ComingSoonView = ({ page }: ComingSoonViewProps) => {
  const content = comingSoonPages[page];
  const { brand } = homeContent.hero;

  return (
    <div className="flex min-h-lvh flex-col bg-background px-6 py-8 text-foreground sm:px-10 xl:px-16">
      <header className="flex items-center justify-between">
        <Link href={brand.href} aria-label={brand.name}>
          <Image
            src={brand.logo}
            alt={brand.name}
            width={106}
            height={24}
            priority
            className="h-[1.5rem] w-auto"
          />
        </Link>
        <Link href={comingSoonCommon.back.href} className={LINK}>
          <span aria-hidden>[ ← </span>
          {comingSoonCommon.back.label}
          <span aria-hidden> ]</span>
        </Link>
      </header>

      <main className="flex flex-1 flex-col justify-center gap-8 py-16">
        <ComingSoonTitle eyebrow={content.eyebrow} title={content.title} />
        <p className="text-label uppercase leading-flat text-accent">
          {comingSoonCommon.status}
        </p>
        <p className="max-w-[28rem] text-lead text-foreground-muted">
          {content.copy}
        </p>
      </main>
    </div>
  );
};

/** Route metadata for a placeholder page — titled, canonical, not indexed. */
export const comingSoonMetadata = (page: ComingSoonKey): Metadata => {
  const content = comingSoonPages[page];
  return {
    ...generateMetadata({
      title: `${content.title} — ${siteConfig.name}`,
      description: content.copy,
      url: content.path,
    }),
    robots: { index: false, follow: true },
  };
};
