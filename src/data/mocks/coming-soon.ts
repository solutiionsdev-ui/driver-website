/**
 * Placeholder pages — every link in the design that points at content the
 * project does not have yet. One entry per route; the view renders them all
 * the same way, so filling a page in later means building its own view and
 * pointing the route at it.
 */

export interface ComingSoonPage {
  /** The route this entry is served at — also its canonical URL. */
  path: string;
  /** Small label above the headline — what the link in the nav said. */
  eyebrow: string;
  /** The page's `<h1>` and `<title>`. */
  title: string;
  copy: string;
}

export const comingSoonCommon = {
  status: "coming soon",
  back: { label: "Back home", href: "/" },
};

export const comingSoonPages = {
  journal: {
    path: "/journal",
    eyebrow: "journal",
    title: "the journal",
    copy: "Race reports, stories and notes from the season — the first entries are on their way.",
  },
  story: {
    path: "/stories/hungarian-gp",
    eyebrow: "journal / hungarian gp",
    title: "the full story",
    copy: "The complete report from the Hungarian GP weekend is still being written.",
  },
  store: {
    path: "/store",
    eyebrow: "store",
    title: "the store",
    copy: "Official merchandise and team gear are coming to the store soon.",
  },
  garage: {
    path: "/garage",
    eyebrow: "garage",
    title: "the garage",
    copy: "A closer look at the car, the kit and the people behind it — opening soon.",
  },
  trailer: {
    path: "/trailer",
    eyebrow: "watch trailer",
    title: "the trailer",
    copy: "The season trailer is in the edit. Check back soon.",
  },
  legal: {
    path: "/legal",
    eyebrow: "legal documents",
    title: "legal",
    copy: "Terms of use, privacy and cookie policies will be published here.",
  },
} satisfies Record<string, ComingSoonPage>;

export type ComingSoonKey = keyof typeof comingSoonPages;
