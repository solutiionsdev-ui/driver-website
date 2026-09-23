/**
 * Home page content — passed into the home view via props (no hardcoded
 * content in components — see obsidian/frontend/component-conventions.md).
 *
 * Every string, link and asset below is transcribed from the GRIDO1 hero
 * frame in Figma (823:247). Casing is left as the design's copy sets it; the
 * uppercase look comes from the `uppercase` utility, not from the data.
 */

export interface HeroLink {
  label: string;
  href: string;
}

export interface HeroMetaRow {
  /** Small mark shown before the label — a flag, a team badge, an icon. */
  icon: string;
  /** Empty when the mark only repeats the label and adds nothing for a reader. */
  iconAlt: string;
  /** Intrinsic box, in design px — each mark is a different shape. */
  iconWidth: number;
  iconHeight: number;
  label: string;
}

export interface HeroStat {
  label: string;
  value: string;
}

/** A season headline figure — the value leads, the label trails it. */
export interface SeasonStat {
  value: string;
  label: string;
}

export interface HomeContent {
  hero: {
    brand: {
      name: string;
      logo: string;
      href: string;
    };
    nav: HeroLink[];
    garage: HeroLink;
    driver: {
      id: string;
      firstName: string;
      lastName: string;
      tagline: string;
      /** Bot-path poster — the same portrait the scene renders. */
      portrait: string;
      meta: HeroMetaRow[];
    };
    nextRace: {
      eyebrow: string;
      name: string;
      circuit: string;
      date: string;
      map: string;
      mapAlt: string;
    };
    season: {
      eyebrow: string;
      stats: HeroStat[];
    };
    trailer: {
      label: string;
      duration: string;
      href: string;
    };
    profile: HeroLink;
    socials: HeroLink[];
  };
  season: {
    /** One line per rendered line — the design breaks it by hand. */
    headline: string[];
    intro: string;
    badge: {
      /** The design splits the two halves across two colours. */
      series: string;
      season: string;
    };
    stats: SeasonStat[];
  };
  footer: {
    /** One line per rendered line — the design breaks it by hand. */
    headline: string[];
    nav: { label: string; href: string }[];
    cta: { label: string; href: string };
    socials: { label: string; href: string }[];
    copyright: string;
  };
  paddock: {
    /** One line per rendered line — the design breaks it by hand. */
    headline: string[];
    intro: string;
    cta: { label: string; href: string };
    /** The race the block is reporting on. */
    meet: { name: string; circuit: string; date: string };
    stats: PaddockStat[];
    calendar: PaddockRound[];
  };
  timeline: {
    /** One line per rendered line — the design breaks it by hand. */
    headline: string[];
    /**
     * Top to bottom. `side` frames sit in the gutter and alternate left and
     * right; `centre` frames straddle the rail. The updated frame opens and
     * closes on a `centre` row — four of them, with three `side` rows between:
     * 169 + 4x462 + 3x217 + 32 is the frame's 2700 exactly.
     */
    entries: TimelineEntry[];
  };
}

export interface FooterLink {
  label: string;
  href: string;
}

export interface PaddockStat {
  icon: string;
  label: string;
  value: string;
}

export interface PaddockRound {
  round: string;
  name: string;
  date: string;
  /** The design's own x for the card, and its width, in the 1440 frame. */
  x: number;
  width: number;
  /** Races already run carry their finish; the rest carry a dot. */
  result?: string;
  /** The round the block is reporting on — cyan, and bracketed. */
  live?: boolean;
}

export interface TimelineEntry {
  year: string;
  /** Which frame this row carries. */
  frame: "side" | "centre";
  /** Set on `side` rows only — `centre` rows always straddle the rail. */
  align?: "left" | "right";
  /** Lead sentence, set bold, then the rest. `centre` rows only. */
  copyLead?: string;
  copy?: string;
  /** The design measures the copy column per row. */
  copyWidth?: number;
  /** The photograph in the frame, and what it shows. */
  image: string;
  alt: string;
}

const UI = "/assets/hero/ui";

const PADDOCK = "/assets/paddock";

export const homeContent: HomeContent = {
  hero: {
    brand: {
      name: "Grido1 Racing Systems",
      logo: `${UI}/grido1-logo.webp`,
      href: "/",
    },
    nav: [
      { label: "Driver", href: "/driver" },
      { label: "SEASON", href: "/season" },
      { label: "journal", href: "/journal" },
      { label: "next race", href: "/next-race" },
      { label: "store", href: "/store" },
    ],
    garage: { label: "Garage", href: "/garage" },
    driver: {
      id: "driver_012",
      firstName: "kimi",
      lastName: "antonelli",
      tagline: "Mercedes-AMG F1 Team rookie, 2026 season",
      portrait: "/assets/hero/scene/person-diffuse.webp",
      meta: [
        {
          icon: `${UI}/flag-italy.webp`,
          iconAlt: "Italy",
          iconWidth: 18,
          iconHeight: 12,
          label: "Italy",
        },
        {
          icon: `${UI}/icon-rookie.svg`,
          iconAlt: "",
          iconWidth: 16,
          iconHeight: 16,
          label: "rookie season_2026",
        },
        {
          icon: `${UI}/mercedes-logo.webp`,
          iconAlt: "",
          iconWidth: 14,
          iconHeight: 14,
          label: "Mercedes-AMG F1 Team",
        },
      ],
    },
    nextRace: {
      eyebrow: "next race",
      name: "belgian gp",
      circuit: "spa-francorchamps",
      date: "27 jul 2026",
      map: `${UI}/circuit-spa.webp`,
      mapAlt: "Spa-Francorchamps circuit layout",
    },
    season: {
      eyebrow: "Season stats",
      stats: [
        { label: "Races", value: "12" },
        { label: "Podiums", value: "3" },
        { label: "Points", value: "118" },
      ],
    },
    trailer: {
      label: "watch trailer",
      duration: "01:26",
      href: "/trailer",
    },
    profile: { label: "view profile", href: "/driver/kimi-antonelli" },
    socials: [
      { label: "inst", href: "https://instagram.com" },
      { label: "x", href: "https://x.com" },
      { label: "youtube", href: "https://youtube.com" },
    ],
  },
  season: {
    headline: ["the season", "so far"],
    intro: "Every race is a step forward. Here's how the season is shaping up.",
    badge: {
      series: "F1",
      season: "/ 2026",
    },
    stats: [
      { value: "P1", label: "in the championship" },
      { value: "6", label: "wins" },
      { value: "9", label: "podiums." },
    ],
  },
  footer: {
    headline: ["keep pushing", "forward"],
    nav: [
      { label: "driver", href: "/driver" },
      { label: "season", href: "/season" },
      { label: "journal", href: "/journal" },
      { label: "next race", href: "/next-race" },
      { label: "store", href: "/store" },
    ],
    cta: { label: "legal documents", href: "/legal" },
    socials: [
      { label: "inst", href: "https://instagram.com" },
      { label: "x", href: "https://x.com" },
      { label: "youtube", href: "https://youtube.com" },
    ],
    copyright: "© 2026 GRID01 Racing Systems. All rights reserved.",
  },
  paddock: {
    headline: ["from the", "paddock"],
    intro:
      "A composed drive through a difficult weekend secured another podium — and kept Kimi at the top of the championship.",
    cta: { label: "read story", href: "/stories/hungarian-gp" },
    meet: {
      name: "hungarian gp",
      circuit: "silverstone",
      date: "july 12, 2026",
    },
    stats: [
      { icon: `${PADDOCK}/icon-flag.svg`, label: "last result", value: "P4" },
      { icon: `${PADDOCK}/icon-bars.svg`, label: "points gained", value: "+12" },
      { icon: `${PADDOCK}/icon-trophy.svg`, label: "championship", value: "P1" },
      { icon: `${PADDOCK}/icon-gauge.svg`, label: "points", value: "118" },
    ],
    // The design sets each card's own x and width in the 1440 frame; they are
    // not on a grid, so they are carried rather than derived.
    calendar: [
      { round: "round 11", name: "austrian gp", date: "29 jun", x: 347, width: 100, result: "p6" },
      { round: "round 12", name: "british gp", date: "12 jul", x: 511, width: 100, result: "p4" },
      { round: "round 13", name: "belgian gp", date: "27 jul", x: 675, width: 100, live: true },
      { round: "round 14", name: "hungarian gp", date: "03 aug", x: 839, width: 114 },
      { round: "round 15", name: "dutch gp", date: "31 aug", x: 1017, width: 76 },
    ],
  },
  timeline: {
    headline: ["from karts", "to f1"],
    entries: [
      {
        year: "2012",
        frame: "centre",
        copyLead: "The first kart.",
        copy: "At six, Kimi discovered karting — turning a childhood curiosity into something of his own.",
        copyWidth: 228,
        image: "/assets/timeline/2012.webp",
        alt: "Kimi in kart overalls in the paddock, aged six",
      },
      {
        year: "2015",
        frame: "side",
        align: "right",
        image: "/assets/timeline/2015.webp",
        alt: "Kimi holding a karting trophy at sunset",
      },
      {
        year: "2019",
        frame: "centre",
        copyLead: "Finding his people.",
        copy: "Kimi joined the Mercedes Junior Programme, marking his first major step into professional motorsport.",
        copyWidth: 272,
        image: "/assets/timeline/2019.webp",
        alt: "Kimi signing with the Mercedes junior team",
      },
      {
        year: "2021",
        frame: "side",
        align: "left",
        image: "/assets/timeline/2021.webp",
        alt: "Kimi beside a single-seater in the garage",
      },
      {
        year: "2024",
        frame: "centre",
        copyLead: "The year everything changed.",
        copy: "Formula 2 brought Kimi closer to F1, while Mercedes confirmed him as their future race driver.",
        copyWidth: 278,
        image: "/assets/timeline/2024.webp",
        alt: "Kimi walking the pit lane in Mercedes kit",
      },
      {
        year: "2025",
        frame: "side",
        align: "right",
        image: "/assets/timeline/2025.webp",
        alt: "Kimi in the Mercedes garage",
      },
      {
        year: "2026",
        frame: "centre",
        copyLead: "From karts to f1.",
        copy: "Kimi is now racing at the highest level, with Bologna still his anchor — family, home and life beyond racing.",
        copyWidth: 284,
        image: "/assets/timeline/2026.webp",
        alt: "The Mercedes-AMG F1 car on track",
      },
    ],
  },
};
