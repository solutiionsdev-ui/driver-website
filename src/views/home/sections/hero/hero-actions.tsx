import Link from "next/link";

import type { HomeContent } from "@/data/mocks/home";

export interface HeroActionsProps {
  trailer: HomeContent["hero"]["trailer"];
  profile: HomeContent["hero"]["profile"];
  socials: HomeContent["hero"]["socials"];
  className?: string;
}

const UI = "/assets/hero/ui";

/** The profile button, lifted straight out of `cta-frame.svg`. */
const CTA = { width: 220, height: 50 } as const;
const CTA_BODY = "M220 42L212.932 50H0V0H220V42Z";
const CTA_BRACKETS = [
  "M205 49.5H213L219.5 42V36",
  "M212 0.5H219.5V7",
  "M8 0.5H0.5V7",
  "M7.5 49.5H0.5V42.5",
];
/** And the mark at its end, out of `arrow-right.svg`. */
const ARROW_PATH = "M0 5.35355H13M8 10.3536L13 5.35355L8 0.353553";

/**
 * The footer row of the hero: trailer cue, the framed profile CTA on the
 * frame's centre line, and the social links (Figma 943:132 / 943:106 / 944:157).
 * The CTA's cut corner and cyan brackets are the exported vector, so the shape
 * stays exactly the designed one instead of an approximation in CSS.
 *
 * Phones stack the three in the order the layout spec numbers them, each one
 * running the container's full width so every left edge lands on the same
 * line. From `sm` the frame's own three-part row returns: trailer left, CTA on
 * the page's centre line, links right.
 */
export const HeroActions = ({
  trailer,
  profile,
  socials,
  className,
}: HeroActionsProps) => (
  <div
    className={`mt-2 flex flex-col items-stretch gap-4 sm:mt-0 sm:grid sm:grid-cols-[1fr_auto_1fr] sm:items-end sm:gap-8 ${className ?? ""}`}
  >
    {/* Gone from phones. From `sm` it returns to the frame's row. */}
    <Link
      href={trailer.href}
      className="group hidden items-center gap-3 text-body uppercase leading-flat sm:flex"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- vector mark; the optimiser rejects SVG */}
      <img
        src={`${UI}/play-button.svg`}
        alt=""
        width={32}
        height={32}
        aria-hidden
        className="size-11 shrink-0 sm:size-8"
      />
      <span className="flex flex-col gap-[0.375rem]">
        <span className="whitespace-nowrap font-medium text-foreground transition-colors duration-[var(--duration-fast)] ease-entrance group-hover:text-accent">
          {trailer.label}
        </span>
        <span className="text-foreground-muted">{trailer.duration}</span>
      </span>
    </Link>

    {/* The frame is measured in **em**, off its own label, and every number
        below is the design's own over the 20 it sets the label at: 220 wide is
        11em, 50 tall is 2.5em, the 32 between label and arrow is 1.6em, the
        13x10 arrow is 0.65 x 0.5em. Figma puts the label 24 in from the left
        and the arrow 24 in from the right (`943:92` inside `943:106`), and
        those two 24s are what centring 172 of content in 220 produces — so the
        frame reproduces the design's padding exactly, and keeps producing it
        at any type scale. In rem it did not: between 1441 and 1920 the label
        grows on the hero's own base while a rem box shrinks on the band's, and
        at 1512 the 24s had been squeezed to 2. */}
    <Link
      href={profile.href}
      className="group relative flex h-14 w-full shrink-0 items-center justify-center gap-[1.6em] text-title sm:h-[2.5em] sm:w-[11em] sm:justify-self-center"
    >
      {/* The frame is inline rather than the exported `cta-frame.svg`, and it
          has to be: the accent floods along the *chamfered path* on hover, the
          way the paddock's and the footer's buttons do, and a path inside an
          `<img>` cannot be reached. Every value below is that file's own —
          same body path, same #0E0F14 interior, same quarter-opacity hairline,
          same four corner brackets. The flood sits under the brackets so they
          stay drawn over it. */}
      <svg
        viewBox={`0 0 ${CTA.width} ${CTA.height}`}
        preserveAspectRatio="none"
        className="absolute inset-0 size-full"
        aria-hidden
      >
        <path d={CTA_BODY} fill="#0E0F14" />
        <path
          d={CTA_BODY}
          fill="var(--accent)"
          className="origin-left transition-transform duration-[var(--duration-normal)] ease-plate [transform:scaleX(0)] group-hover:[transform:scaleX(1)]"
        />
        <g fill="none" stroke="var(--accent)">
          <path d={CTA_BODY} strokeOpacity={0.25} />
          {CTA_BRACKETS.map((bracket) => (
            <path key={bracket} d={bracket} />
          ))}
        </g>
      </svg>
      <span className="relative uppercase leading-flat text-accent transition-colors duration-[var(--duration-normal)] ease-plate group-hover:text-surface-black">
        {profile.label}
      </span>
      <svg
        viewBox="0 0 13.7071 10.7071"
        aria-hidden
        className="relative h-[0.5em] w-[0.65em] transition-transform duration-[var(--duration-fast)] ease-entrance group-hover:translate-x-1"
      >
        <path
          d={ARROW_PATH}
          fill="none"
          className="stroke-accent transition-colors duration-[var(--duration-normal)] ease-plate group-hover:stroke-surface-black"
        />
      </svg>
    </Link>

    {/* Gone from phones. From `sm` they return to the frame's row. */}
    <ul className="hidden w-full items-center justify-between text-body uppercase leading-flat sm:flex sm:w-auto sm:justify-start sm:gap-8 sm:justify-self-end xl:gap-[3.6875rem]">
      {socials.map((social) => (
        <li key={social.href}>
          <Link
            href={social.href}
            className="text-foreground transition-colors duration-[var(--duration-fast)] ease-entrance hover:text-accent"
          >
            {social.label}
          </Link>
        </li>
      ))}
    </ul>
  </div>
);
