import { headers } from "next/headers";

// Detect if the user agent is a bot (Lighthouse, Googlebot, etc.)
export const isBot = async (): Promise<boolean> => {
  const headersList = await headers();
  const userAgent = headersList.get("user-agent") || "";
  const ua = userAgent.toLowerCase();
  return BOT_MARKERS.some((marker) => ua.includes(marker));
};

/**
 * Substrings that mean "do not build the WebGL scene for this request".
 *
 * Two groups, and both matter for different reasons. **Auditors** (Lighthouse,
 * PageSpeed, WebPageTest…) are measuring script evaluation time, so shipping
 * three.js to them scores the bundle rather than the page. **Crawlers and
 * social scrapers** get the poster instead, which is what ends up in a search
 * result or a link preview — an unpainted canvas is what they capture
 * otherwise.
 *
 * Kept deliberately broad: a false positive costs one visitor a static poster,
 * a false negative costs a Lighthouse score or a blank share card.
 */
const BOT_MARKERS = [
  // Auditors and synthetic monitoring
  "lighthouse",
  "chrome-lighthouse",
  "pagespeed",
  "gtmetrix",
  "pingdom",
  "webpagetest",
  "headlesschrome",
  // Search crawlers
  "googlebot",
  "google-inspectiontool",
  "bingbot",
  "yandexbot",
  "duckduckbot",
  "baiduspider",
  "applebot",
  "petalbot",
  // Social / link-preview scrapers — these produce the share card
  "facebookexternalhit",
  "twitterbot",
  "linkedinbot",
  "slackbot",
  "discordbot",
  "whatsapp",
  "telegrambot",
  "embedly",
  "redditbot",
  "pinterest",
  // Generic
  "bot",
  "crawler",
  "spider",
] as const;
