"use client";

// 📖 Docs: obsidian/frontend/components/sections.md

import type { CSSProperties } from "react";
import Image from "next/image";
import { useInView } from "@react-spring/web";
import TextEngine from "spring-text-engine";

import { Spring } from "@/components/animation/springs/spring";
import { SpringTrigger } from "@/components/animation/springs/spring-trigger";
import type { TimelineEntry } from "@/data/mocks/home";

import {
  COPY_LEFT,
  PARALLAX,
  PLATE_WIDTH,
  ROW_HEIGHT,
  px,
  type,
} from "./geometry";
import { TimelinePlate } from "./timeline-plate";

// Module constants, not JSX literals: these are handed to `useSpring`, and a
// fresh object per render re-seeds the animation mid-flight.
const YEAR_OUT = { opacity: 0, y: "0.3em" };
const YEAR_IN = { opacity: 1, y: "0em" };
const YEAR_CONFIG = { tension: 190, friction: 24 };
const COPY_FROM = { opacity: 0, transform: "translateY(0.75rem)" };
const COPY_TO = { opacity: 1, transform: "translateY(0rem)" };
const COPY_CONFIG = { tension: 110, friction: 26 };
const LETTER_STAGGER = 26;

/**
 * One parallax layer, scrubbed by the row's own crossing of the viewport.
 *
 * It travels on `top` against a `relative` inner box, which is the same route
 * `./timeline-plate` takes for the photograph inside its frame — and for the
 * same reason. The two obvious alternatives both fail silently here:
 * react-spring's `y` shorthand resolves a percentage string to
 * `transform: none`, and a whole `transform: translateY(...)` goes through the
 * trigger's `interpolate` (`src/utils/math.ts`), whose transform-function
 * branch rebuilds it as `translateY(-36(cqw)` — invalid CSS, so the spring
 * holds the last value it parsed and the layer looks frozen. The plain-unit
 * branch is correct, so a bare `cqw` on `top` is what actually animates.
 *
 * `cqw` and not pixels: the whole block is measured off its own width so a
 * design pixel stays one at any viewport (`px()` in `./geometry`), and a
 * parallax in fixed pixels would be the one thing in it that did not scale.
 *
 * The layer wraps *content*, never a positioned box. Every target here is
 * already placed by the design — the plate absolutely, the year and the copy
 * against `top-1/2` — and moving those boxes would mean re-deriving placement
 * that the frame settled. Sliding what is inside them is the same picture.
 *
 * The travel is centred on that design position rather than hung off it, which
 * costs one thing worth naming: the spring initialises on `from`, so a row
 * already on screen at first paint is drawn half a travel out of place for the
 * frame it takes the ticker to read the scroll. Below the fold — which is
 * every row but the first, and the block is the page's third — the correction
 * lands long before the row arrives.
 */
const ParallaxLayer = ({
  travel,
  inline = false,
  className,
  children,
}: {
  /** Upward drift across the full crossing, in design pixels. */
  travel: number;
  /**
   * Render as spans. `SpringTrigger` emits a `div` inside a `div` by default,
   * and two of the three layers here live inside phrasing content — the year
   * in a `span`, the copy in a `p` — where a `div` is invalid nesting and the
   * browser closes the paragraph early. Both boxes are made blocks by class
   * instead, which is the same box with a legal tag.
   */
  inline?: boolean;
  className?: string;
  children: React.ReactNode;
}) => (
  <SpringTrigger
    // The row's whole crossing: 0 as its top meets the viewport's bottom, 1 as
    // its bottom leaves the top. Anything shorter finishes the travel while
    // the row is still on screen and then holds, which reads as a stall.
    start="top bottom"
    end="bottom top"
    mode="scrub"
    // Symmetric, so the layer passes through its design position exactly as
    // the row passes the middle of the screen. Hanging the travel off that
    // position instead would mean the frame's own composition is only ever
    // true on the way in, and would buy half the differential per pixel moved.
    from={{ top: px(travel) }}
    to={{ top: `-${px(travel)}` }}
    tag={inline ? "span" : "div"}
    innerTag={inline ? "span" : "div"}
    className={className}
    innerClassName={`relative block ${inline ? "" : "size-full"}`}
  >
    {children}
  </SpringTrigger>
);

/**
 * The year is legible on arrival, then gets out of the way.
 *
 * Over a plate it rests at 0.4 — the reference's own figure, and what keeps it
 * reading as the plate's marker rather than as the loudest thing in the row.
 * Against a photograph that is close to unreadable, though, and the year is the
 * one piece of information the row carries. So it lands at full strength,
 * holds long enough to be read, and only then settles back. Rows whose plate
 * sits out at a gutter never dim: their year is over bare ground already.
 */
const YEAR_RESTING = 0.4;
/** From the letters landing to the fade starting, in ms. */
const YEAR_HOLD = 2200;
/** Slow on purpose — a quick fade reads as a glitch rather than a settle. */
const YEAR_SETTLE = { tension: 32, friction: 26 };
const YEAR_BRIGHT = { opacity: 1 };
const YEAR_DIM = { opacity: YEAR_RESTING };

/**
 * Hovering one plate dims the rest, as the reference does — and it dims the
 * **whole row**, not just the plate.
 *
 * The year and the copy are siblings of the plate, not children of it: the year
 * straddles the rail and the copy overhangs the plate's right edge by 55. With
 * the dimming on the plate alone they stayed at full strength while the plate
 * behind them fell to 0.3, so the text over the artwork lit up instead of
 * receding with it. The row's own `hover:` is what exempts the row being
 * pointed at, and it fires because the plate is inside it.
 */
const dimmable =
  "transition-opacity duration-[var(--duration-plate)] ease-plate " +
  // **Only where there is a pointer.** The rule dims every row but the one
  // being pointed at, which needs a pointer to mean anything: on a touch
  // screen `:hover` sticks after a tap and never clears, so the whole block
  // sat at 0.3 with nothing lit. `hover:hover` is the media query for a
  // device that can actually hover, which is the condition the effect was
  // written for in the first place.
  "[@media(hover:hover)]:group-has-[[data-timeline-plate]:hover]/timeline:opacity-30 " +
  "[@media(hover:hover)]:group-has-[[data-timeline-plate]:hover]/timeline:hover:opacity-100";

export const TimelineRow = ({
  entry,
  index,
}: {
  entry: TimelineEntry;
  /** Its place in the column — the phone alternates plates by it. */
  index: number;
}) => {
  const side = entry.frame === "side";
  /**
   * The row's own entrance runs when the row **arrives**, not when the page
   * mounts. `Spring` and `TextEngine` both take a plain boolean, and every
   * block on this page mounts at once — so left ungated the whole timeline
   * played through at load, and the year's hold was spent three screens above
   * anyone who could read it. A quarter of the viewport of margin keeps the
   * row from starting while it is still under the fold.
   */
  // Under `COLUMN_UNDER` the year sits under its photograph on bare ground,
  // not over it, so the settle that keeps it from shouting over a picture
  // does not apply — dimmed there it simply could not be read. The threshold
  // is the layout's, not a legibility one: it has to move with the `max-sm:`
  // classes below or the year dims over open ground.

  const [viewRef, inView] = useInView({
    once: true,
    rootMargin: "0% 0% -25% 0%",
  });

  return (
    <div
      ref={viewRef}
      // Column below the port, the design's own absolute row from `xl`.
      className={`relative h-[var(--row-h)] w-full shrink-0 max-sm:flex max-sm:h-auto max-sm:flex-col max-sm:gap-3 ${dimmable}`}
      style={{ "--row-h": px(ROW_HEIGHT[entry.frame]) } as CSSProperties}
    >
      {/* Placement lives on the wrapper, not on the plate: Tailwind resolves
          `relative` and `absolute` by emission order, not by class order, so a
          positioned plate passed its position in through `className` lost.
          Below the port it is simply the column's first item, holding the
          design's own 710:462 so the photograph is never letterboxed. */}
      <div
        // **The phone alternates.** The frame's own rhythm is a centre plate
        // between side ones, which on one column reads as full width, narrow,
        // full width — a stutter rather than a rhythm. Every row there is the
        // same 82% and swaps side with its index, so the column zig-zags the
        // way the frame's own plates do across the block.
        className={`absolute inset-y-0 w-[var(--plate-w)] max-sm:static max-sm:aspect-[710/462] max-sm:h-auto max-sm:w-[82%] ${
          index % 2 === 0
            ? "max-sm:mr-auto max-sm:ml-0"
            : "max-sm:ml-auto max-sm:mr-0"
        } ${
          side
            ? entry.align === "right"
              ? "right-[var(--gutter)]"
              : "left-[var(--gutter)]"
            : "left-1/2 -translate-x-1/2 max-sm:mx-0 max-sm:translate-x-0"
        }`}
        style={{ "--plate-w": px(PLATE_WIDTH[entry.frame]) } as CSSProperties}
      >
        {/* The plate itself drifts, and the photograph drifts again *inside*
            it — `timeline-plate` runs its own scrub on the slot. The two
            compose on purpose: the frame moves against the block, the picture
            moves against the frame, and the second is what keeps the frame
            from reading as a sticker being slid around. */}
        <ParallaxLayer
          travel={PARALLAX.plate[entry.frame]}
          className="block size-full"
        >
          <TimelinePlate>
            {/* **110% tall, pinned to the top**, and that is what the parallax
              needs: the slot travels from -10% of its own height to 0, so a
              photograph exactly as tall as the frame would leave a tenth of it
              empty at the start of the run. The overscan *is* the travel, and
              the files are cut to 710x508 to carry it — see `timeline-plate`
              for why it is 10 and not the reference's 30. */}
            <Image
              src={entry.image}
              alt={entry.alt}
              fill
              sizes={side ? "24vw" : "50vw"}
              className="!h-[110%] object-cover"
            />
          </TimelinePlate>
        </ParallaxLayer>
      </div>

      {/* `pointer-events-none` on every label, as the reference marks them:
          from `xl` they sit right over the middle of the plate, and without it
          the year swallows the plate's hover. */}
      {/* The year assembles letter by letter as its row arrives — the same
          treatment the season block gives its figures. `mode="forward"`, so it
          plays on the way down and holds on the way back up.

          **It dims only where it lands on a plate, and only after it has been
          read.** A side row puts its plate out at a gutter and the column
          layout puts the year under the picture entirely, so in both cases it
          is over bare ground and stays at full strength; a centre row at full
          width puts a photograph under it, and there a permanent
          full-strength year was the loudest thing in the row instead of the
          plate's marker — while a permanently dimmed one was barely legible
          against the picture. So it arrives lit, holds for `YEAR_HOLD`, then
          settles to `YEAR_RESTING`. Row dimming multiplies with the result. */}
      <span
        // The floor arrives inside the inline value, as everywhere else in
        // the block: a class cannot beat an inline declaration.
        style={{ fontSize: `max(${type(36)}, var(--year-min, 0px))` }}
        // **On the photograph, as the frame has it.** In the phone's column
        // the year follows the picture in the flow, so it is lifted back onto
        // it — `relative` and `cqw`, not a margin: a margin would take the
        // copy up with it, and a percentage `top` would resolve against the
        // row's own height rather than its width, which is what sets the
        // picture's height through its aspect. `h-0` so the year keeps no
        // room of its own and the copy follows the picture directly. It lands
        // on the **middle** of the picture, as the frame has it. Two amounts,
        // because a row aligned right is 82% as wide and that much shorter.
        // **Centred on the picture, not on the row.** The phone's plates are
        // 82% of the column and swap sides, so a year centred on the row sat
        // off the photograph by 31 either way; it takes the plate's own width
        // and side, and `text-center` does the rest. The lift is one number
        // now that every plate is the same width: half the picture's height
        // — itself 82% of the column times the frame's 710:462 — plus the
        // column's gap and half the year's own line.
        className={`pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 font-display font-bold uppercase leading-headline text-accent max-sm:relative max-sm:left-auto max-sm:h-0 max-sm:w-[82%] max-sm:translate-x-0 max-sm:translate-y-0 max-sm:text-center max-sm:top-[-28.8cqw] ${
          index % 2 === 0 ? "max-sm:mr-auto" : "max-sm:ml-auto"
        }`}
      >
        {/* The plate's figure, not one of its own: the year is the marker
            *on* that photograph, and a layer of its own would slide it off the
            picture it belongs to. Over bare ground on a side row it costs
            nothing to keep them matched. */}
        <ParallaxLayer
          travel={PARALLAX.plate[entry.frame]}
          inline
          className="block"
        >
          <Spring
            tag="span"
            mode="forward"
            enabled={inView}
            config={YEAR_SETTLE}
            delayIn={YEAR_HOLD}
            from={YEAR_BRIGHT}
            to={side ? YEAR_BRIGHT : YEAR_DIM}
            className="block"
          >
            <TextEngine
              tag="span"
              mode="forward"
              enabled={inView}
              letterStagger={LETTER_STAGGER}
              letterOut={YEAR_OUT}
              letterIn={YEAR_IN}
              letterConfig={YEAR_CONFIG}
              className="justify-center"
            >
              {entry.year}
            </TextEngine>
          </Spring>
        </ParallaxLayer>
      </span>

      {entry.copy ? (
        /* A block reveal rather than a word one, and deliberately: the copy
           sets a bold lead against a regular remainder, and the text engine
           lays words out as flex items — two runs cannot wrap into each other
           as one paragraph. The design's mixed weight wins over the fancier
           reveal. It rises a beat behind its year. */
        <Spring
          tag="p"
          mode="forward"
          enabled={inView}
          config={COPY_CONFIG}
          delayIn={220}
          from={COPY_FROM}
          to={COPY_TO}
          // The column widens below `lg`. Its 284 is measured against a
          // 1440 block; at 768 that is 151 real pixels, and copy boosted back
          // to a readable size inside it broke into six and seven short lines.
          // The width is overridden through the **variable**, not through a
          // competing `w-` utility: two utilities setting the same property
          // are resolved by their order in the generated stylesheet, not by
          // the order they are written here, and the narrow one lost.
          // The year above it was lifted onto the photograph with a negative
          // margin; this gives the same amount back, so the copy stays where
          // it was and only the year moved.
          className="pointer-events-none absolute top-1/2 z-20 -translate-y-1/2 uppercase leading-display text-foreground-on-dark max-sm:static max-sm:w-full max-sm:translate-y-0"
          style={
            {
              left: px(COPY_LEFT),
              // Widened below `lg` through the same `max()` route as the type
              // above — the frame's 284 is 151 real pixels at 768, and the
              // copy broke into six short lines. 200 is what is left between
              // the column's own x and the block's right gutter.
              width: `min(max(${px(entry.copyWidth ?? 284)}, var(--copy-min-w, 0px)), var(--copy-max-w, 100vw))`,
              // The copy is the one run of real prose in the block, and a
              // share of 768 puts the frame's 18 at 9.6. `max()` against a
              // variable the section sets is what lifts it — an inline
              // declaration beats a class, so the floor has to arrive inside
              // the inline value. Nothing else in the block moves.
              fontSize: `max(${type(18)}, var(--copy-min-size, 0px))`,
            } as CSSProperties
          }
        >
          {/* Furthest of the three. The copy is the layer nearest the reader —
              it sits over the photograph on `z-20` — and in a parallax the
              nearest thing moves most. Wrapping the text rather than the `p`
              keeps the design's own placement (`COPY_LEFT`, `top-1/2`) exactly
              where the frame put it. */}
          <ParallaxLayer travel={PARALLAX.copy} inline className="block">
            <span className="font-bold">{entry.copyLead} </span>
            {entry.copy}
          </ParallaxLayer>
        </Spring>
      ) : null}
    </div>
  );
};
