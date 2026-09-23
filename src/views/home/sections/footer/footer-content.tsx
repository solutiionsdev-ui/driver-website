"use client";

// 📖 Docs: obsidian/frontend/components/sections.md

import type { CSSProperties } from "react";
import Link from "next/link";
import TextEngine from "spring-text-engine";

import { Spring } from "@/components/animation/springs/spring";
import type { HomeContent } from "@/data/mocks/home";

import {
  ARROW_PATH,
  CTA,
  CTA_PATH,
  FOOT,
  GUTTER,
  masthead,
  HEADLINE,
  LOGO,
  NAV,
  px,
  type,
} from "./geometry";

export interface FooterContentProps {
  content: HomeContent["footer"];
}

const REVEAL_CONFIG = { tension: 90, friction: 26 };
const ROW_CONFIG = { tension: 170, friction: 24 };
const LINE_STAGGER = 130;

// Module constants, not JSX literals: a fresh object per render re-seeds the
// animation mid-flight.
const WORD_OUT = { opacity: 0, y: "0.35em" };
const WORD_IN = { opacity: 1, y: "0em" };
const LETTER_OUT = { opacity: 0, y: "0.3em" };
const LETTER_IN = { opacity: 1, y: "0em" };
const FADE_FROM = { opacity: 0 };
const FADE_TO = { opacity: 1 };
const RISE_FROM = { opacity: 0, transform: "translateY(0.75rem)" };
const RISE_TO = { opacity: 1, transform: "translateY(0rem)" };

/** Keeps each line's engine as wide as its words, so the dot sits flush. */
const LINE_FLOW = "shrink-0 grow-0 basis-auto";

/** The nav arrives from the top down, a beat a row. */
/**
 * The button's own height, and everything in it as a ratio of that — the same
 * control the paddock and the hero carry, and below `lg` the same size: the
 * frame's 275x50 scaled with the block put a boosted label in a box built for
 * unboosted type, and the arrow ended up outside its own frame.
 */
/**
 * The block's own gutter. The frame's 32 is 8.7 real pixels on a phone, which
 * is not a margin — every edge in the block reads it so one floor moves the
 * lot.
 */
const G = `var(--foot-gutter, ${px(GUTTER)})`;

const CTA_H = `var(--cta-h, ${px(CTA.height)})`;
const ctaPx = (value: number) => `calc(${CTA_H} * ${value / CTA.height})`;

const NAV_DELAY = 260;
const NAV_STAGGER = 80;
const FOOT_DELAY = 640;

/**
 * Everything the footer says.
 *
 * The masthead is built the way all three other blocks build theirs — one
 * `<h2>`, one `TextEngine` per authored line so the break holds at every
 * width, the full stop set apart so it can carry white against the accent.
 * The nav rows resolve letter by letter down the column; the foot fades up
 * last, so the block reads top to bottom on arrival.
 */
export const FooterContent = ({ content }: FooterContentProps) => (
  <>
    <Spring
      tag="div"
      mode="forward"
      enabled
      config={REVEAL_CONFIG}
      delayIn={120}
      from={FADE_FROM}
      to={FADE_TO}
      // The logo is the design's own artwork used as a *mask* filled with the
      // accent, not a tinted image — that is how it stays one flat colour.
      // The logo rides the type boost too: it is a wordmark, so at the size a
      // share of a 768 block gives it, it read as a smudge next to copy that
      // had been lifted back to a legible size.
      className="absolute z-20 h-[var(--h)] w-[var(--w)] bg-accent"
      style={
        {
          left: G,
          top: G,
          "--w": `var(--logo-w, ${px(LOGO.width)})`,
          "--h": `var(--logo-h, ${px(LOGO.height)})`,
          maskImage: "url(/assets/footer/logo-mask.png)",
          maskSize: "100% 100%",
          maskRepeat: "no-repeat",
        } as CSSProperties
      }
      aria-label="GRID01 Racing Systems"
      role="img"
    />

    <h2
      // **Not on a phone.** Two lines of 40 took a third of the block for a
      // line that says nothing the page has not already said, and the room it
      // freed goes to the helmet, which is the thing the footer is.
      className="absolute z-20 flex w-[var(--w)] flex-col items-end font-display font-bold uppercase leading-headline text-accent max-sm:hidden"
      style={
        {
          // The frame's own 32, and the same 32 it keeps from the right
          // edge — the two gaps read as one inset.
          // Right-aligned in its own corner from `sm`, as the frame has it —
          // and **left, under the logo** on a phone, where everything else in
          // the block starts at the same gutter and a lone right-aligned
          // masthead read as a stray.
          top: `var(--foot-head-top, ${G})`,
          right: `var(--foot-head-right, ${G})`,
          left: "var(--foot-head-left, auto)",
          // Same as the timeline's masthead: the frame's 370 is measured
          // against 55, and at the floor's size in a narrow block the line
          // outgrew it.
          "--w": `max(${px(HEADLINE.width)}, var(--head-w-min, 0px))`,
          // The frame's 370 is measured against type that has not been
          // boosted. Below `lg` it has, and the line ran off the right edge of
          // the block — the column is right-aligned, so it overflows outward.
          // "forward." is the longest word in the block; at the floor's size
          // in a 338 box it ran off the right edge. Below `lg` the masthead
          // takes its own, smaller floor.
          fontSize: `max(${px(55)}, var(--foot-head-min, 0px))`,
        } as CSSProperties
      }
    >
      {content.headline.map((line, index) => {
        const last = index === content.headline.length - 1;
        return (
          <span key={line} className="flex items-baseline">
            <TextEngine
              tag="div"
              mode="forward"
              enabled
              delayIn={index * LINE_STAGGER}
              wordStagger={110}
              wordOut={WORD_OUT}
              wordIn={WORD_IN}
              wordConfig={REVEAL_CONFIG}
              className={`justify-end text-right ${LINE_FLOW}`}
            >
              {line}
            </TextEngine>
            {last ? (
              <Spring
                tag="span"
                mode="forward"
                enabled
                config={REVEAL_CONFIG}
                delayIn={index * LINE_STAGGER + 110}
                from={FADE_FROM}
                to={FADE_TO}
                aria-hidden
                className="text-foreground-on-dark"
              >
                .
              </Spring>
            ) : null}
          </span>
        );
      })}
    </h2>

    <nav
      className="absolute left-0 z-20 flex -translate-y-1/2 flex-col font-display font-bold uppercase leading-headline text-foreground-on-dark"
      style={{
        // Halfway down the block, which is where the frame has it — higher
        // on the phone, where the helmet fills the width and the column has
        // to stand above it rather than beside it.
        top: "var(--nav-mid, 50%)",
        // The block's own gutter, the same 32 the logo and the masthead keep.
        marginLeft: G,
        width: `var(--nav-w, ${px(NAV.width)})`,
        // The column runs at the frame's own sizes below `lg`, like the
        // buttons and the two instrument panels: a share of 768 put 36 at 19,
        // which is smaller than the copy in the block above it.
        gap: `var(--nav-gap, ${type(NAV.gap)})`,
        fontSize: `var(--nav-size, ${type(NAV.size)})`,
      }}
    >
      {content.nav.map((item, index) => (
        <Link
          key={item.label}
          href={item.href}
          // `w-max`, not `w-full`: "next race" is wider than the 158 the
          // design gives the column, and the text engine lays words out as
          // flex items with its own wrap set *inline* — constrained, it broke
          // the row in two and the second line landed on top of "store".
          // **A row per item on the phone**, full width with a rule under it
          // and the accent arrow at its end: a column of five bare words in a
          // block this size reads as a list of labels, not as the way out of
          // the page. The pad under the label matches the column's gap, so
          // each rule sits the same distance from the word above it as from
          // the one below.
          className="block w-max transition-colors duration-[var(--duration-fast)] ease-entrance hover:text-accent max-sm:flex max-sm:w-full max-sm:items-center max-sm:justify-between max-sm:border-b max-sm:border-foreground-on-dark/15 max-sm:pb-[18px]"
          style={{ height: `var(--nav-row, ${type(NAV.row)})` }}
        >
          <TextEngine
            tag="span"
            mode="forward"
            enabled
            delayIn={NAV_DELAY + index * NAV_STAGGER}
            letterStagger={22}
            letterOut={LETTER_OUT}
            letterIn={LETTER_IN}
            letterConfig={ROW_CONFIG}
            // The engine spaces words with its own gap rather than the face's;
            // 0.2 keeps "next race" inside the width the design draws.
            columnGap={0.2}
            className="flex-nowrap justify-start whitespace-nowrap"
          >
            {item.label}
          </TextEngine>

          {/* Phone only: the row's own way out. Same arrow the buttons carry,
              in the accent, so the list reads as five links rather than five
              headings. */}
          <svg
            viewBox="0 0 13.71 10.71"
            aria-hidden
            className="hidden h-[0.7em] w-[0.9em] shrink-0 max-sm:block"
          >
            <path
              d={ARROW_PATH}
              fill="none"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
              className="stroke-accent"
            />
          </svg>
        </Link>
      ))}
    </nav>

    <Spring
      tag="p"
      mode="forward"
      enabled
      config={REVEAL_CONFIG}
      delayIn={FOOT_DELAY}
      from={RISE_FROM}
      to={RISE_TO}
      className="absolute z-20 uppercase leading-display text-foreground-on-dark-faint"
      style={{
        left: G,
        bottom: `max(${px(FOOT.bottom)}, var(--foot-bottom-min, 0px))`,
        // The frame's 220 is measured against type that has not been
        // boosted; at the floor it broke into four short lines.
        width: `max(${type(FOOT.copyWidth)}, var(--foot-copy-min, 0px))`,
        fontSize: type(14),
      }}
    >
      {content.copyright}
    </Spring>

    <Spring
      tag="div"
      mode="forward"
      enabled
      config={REVEAL_CONFIG}
      delayIn={FOOT_DELAY + 80}
      from={RISE_FROM}
      to={RISE_TO}
      className="absolute z-20 [translate:var(--cta-shift,0)]"
      style={{
        // The frame's own x, and the block's middle below `lg` — where the
        // row has only three items and the button is the one that anchors it.
        left: `var(--cta-left, ${px(CTA.x)})`,
        // The same foot the copyright and the socials keep, so the row sits
        // on one line at every width — except on the phone, where the three
        // of them cannot stand side by side and the button takes the foot
        // with the other two stacked above it.
        bottom: `var(--cta-bottom, max(${px(FOOT.bottom)}, var(--foot-bottom-min, 0px)))`,
      }}
    >
      <Link
        href={content.cta.href}
        // Sized in **em** off its own label below `lg`, exactly as the hero's
        // profile button is: the frame's 275x50 is measured against type that
        // has not been boosted, and the boosted label had outgrown it.
        className="group/cta relative block h-[var(--h)] w-[var(--w)]"
        style={
          {
            "--h": CTA_H,
            "--w": `var(--cta-w, calc(${CTA_H} * ${CTA.width / CTA.height}))`,
            fontSize: ctaPx(20),
          } as CSSProperties
        }
      >
        {/* Same shape family as the paddock's button, and the same hover: the
            accent floods along the *chamfered path* so the cut corner survives
            the fill. Hollow here rather than filled — this one sits on the
            block's own near-black panel, where the design leaves it open. */}
        {/* `preserveAspectRatio="none"`: the button spans the block's own
            column on a phone, so its box is wider than the 275x50 the path is
            drawn in — left to fit, the frame scaled to the height and sat
            centred, 34 short of each edge. The stroke stays 1px through
            `vectorEffect`. */}
        <svg
          viewBox={`0 0 ${CTA.width} ${CTA.height}`}
          preserveAspectRatio="none"
          className="absolute inset-0 size-full"
          aria-hidden
        >
          <path
            d={CTA_PATH}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={CTA_PATH}
            fill="var(--accent)"
            className="origin-left transition-transform duration-[var(--duration-normal)] ease-plate [transform:scaleX(0)] group-hover/cta:[transform:scaleX(1)]"
          />
        </svg>

        <span
          // Left-padded from `sm`, as the frame draws it; **centred on the
          // phone**, where the button runs the whole column and a label
          // pinned to its left edge with the arrow adrift in the middle read
          // as two unrelated things.
          className="absolute inset-y-0 flex items-center whitespace-nowrap uppercase leading-flat text-accent transition-colors duration-[var(--duration-normal)] ease-plate group-hover/cta:text-surface-black max-sm:inset-x-0 max-sm:justify-center"
          style={{ left: ctaPx(CTA.padX), gap: ctaPx(CTA.gap) }}
        >
          {content.cta.label}
          <svg
            viewBox="0 0 13.71 10.71"
            aria-hidden
            className="block transition-transform duration-[var(--duration-fast)] ease-entrance group-hover/cta:translate-x-1"
            style={{ width: ctaPx(13.71), height: ctaPx(10.71) }}
          >
            <path
              d={ARROW_PATH}
              fill="none"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
              className="stroke-accent transition-colors duration-[var(--duration-normal)] ease-plate group-hover/cta:stroke-surface-black"
            />
          </svg>
        </span>
      </Link>
    </Spring>

    <Spring
      tag="ul"
      mode="forward"
      enabled
      config={REVEAL_CONFIG}
      delayIn={FOOT_DELAY + 160}
      from={RISE_FROM}
      to={RISE_TO}
      className="absolute z-20 flex list-none items-center justify-between whitespace-nowrap uppercase leading-flat text-foreground-on-dark max-sm:justify-start max-sm:gap-6"
      style={{
        // From the right gutter: at 1440 this is the frame's own 1202, and at
        // every other width it is the same 32 the copyright keeps on the left.
        right: `var(--social-right, ${G})`,
        left: "var(--social-left, auto)",
        // Its own foot on a phone, where the row is a stack rather than a row.
        bottom: `var(--social-bottom, max(${px(FOOT.bottom)}, var(--foot-bottom-min, 0px)))`,
        width: `max(${type(FOOT.socialWidth)}, var(--social-min-w, 0px))`,
        fontSize: type(14),
      }}
    >
      {content.socials.map((social) => (
        <li key={social.label}>
          <Link
            href={social.href}
            className="transition-colors duration-[var(--duration-fast)] ease-entrance hover:text-accent"
          >
            {social.label}
          </Link>
        </li>
      ))}
    </Spring>
  </>
);
