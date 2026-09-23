/**
 * @fileoverview JSON-LD structured data helpers.
 *
 * Structured data lets search engines understand the site as entities
 * (Organization, WebSite) rather than just text — improving rich results.
 * Render the output inside a `<script type="application/ld+json">` tag.
 */

import { siteConfig } from "@/lib/site";

/**
 * Organization + WebSite schema for the site root. Emit once, in the root
 * layout. The two nodes are linked by `@id` so crawlers treat them as related.
 */
export function getSiteStructuredData() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteConfig.url}/#organization`,
        name: siteConfig.name,
        url: siteConfig.url,
        logo: `${siteConfig.url}/android-icon-192x192.png`,
      },
      {
        "@type": "WebSite",
        "@id": `${siteConfig.url}/#website`,
        name: siteConfig.name,
        description: siteConfig.description,
        url: siteConfig.url,
        publisher: { "@id": `${siteConfig.url}/#organization` },
        // The site is *about* the driver — without this the graph describes a
        // company and a page, and never says who the subject is.
        about: { "@id": `${siteConfig.url}/#driver` },
      },
      {
        "@type": "Person",
        "@id": `${siteConfig.url}/#driver`,
        name: "Athlete Name",
        jobTitle: "Formula 1 Driver",
        nationality: { "@type": "Country", name: "Nationality" },
        image: `${siteConfig.url}${siteConfig.ogImage}`,
        memberOf: { "@type": "SportsTeam", name: "Team Name" },
        url: siteConfig.url,
      },
    ],
  };
}
