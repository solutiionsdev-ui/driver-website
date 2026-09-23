"use client";

// 📖 Docs: obsidian/frontend/components/sections.md

import TextEngine from "spring-text-engine";

import { Spring } from "@/components/animation/springs/spring";
import type { HomeContent } from "@/data/mocks/home";

import { PLATE, px, type } from "./geometry";
import { SeasonGlobe } from "./season-globe";

export interface SeasonPlateProps {
  badge: HomeContent["season"]["badge"];
  stats: HomeContent["season"]["stats"];
  className?: string;
}

const REVEAL_CONFIG = { tension: 90, friction: 26 };
/** Letters are small here; they want a quicker, flatter spring than the copy. */
const TYPE_CONFIG = { tension: 210, friction: 24 };

const PLATE_FROM = { opacity: 0, transform: "translateY(0.75rem)" };
const PLATE_TO = { opacity: 1, transform: "translateY(0rem)" };

// Module constants, not JSX literals: the engine hands these to `useSpring`,
// and a fresh object per render re-seeds the animation mid-flight.
const LETTER_OUT = { opacity: 0, y: "0.3em" };
const LETTER_IN = { opacity: 1, y: "0em" };

/** The plate lands first, then the type types itself in behind it. */
const PLATE_DELAY = 260;
const TYPE_DELAY = PLATE_DELAY + 170;
/** Per-row offset into the run, in ms. */
const ROW_STAGGER = 110;
const LETTER_STAGGER = 22;

/** The outline is stroked, so it runs down the middle of the box's edge. */
const EDGE = 0.5;
const OUTLINE = [
  `M${EDGE} ${EDGE}`,
  `H${PLATE.width - EDGE}`,
  `V${PLATE.height - PLATE.cut}`,
  `L${PLATE.width - PLATE.cut} ${PLATE.height - EDGE}`,
  `H${EDGE}`,
  "Z",
].join("");

/**
 * The standings plate: the season badge in a cyan-ruled cell, the three
 * headline figures beside it. The bottom-right corner is cut.
 *
 * The frame is one **stroked SVG path**, not a CSS border. A border cannot
 * follow a chamfer, and the first pass tried to fake it by clipping a bordered
 * box — which cuts the corner but leaves the diagonal itself unstroked, so the
 * outline hung open at the bottom right with two loose ends. Drawn as a path
 * the chamfer is an edge like any other. The path is also **filled** with the
 * surface, because the plate is an instrument reading laid over the map rather
 * than a window onto it, and the map's own furniture drifts under it as the
 * backdrop re-crops.
 *
 * The plate arrives as one block, then its type resolves letter by letter —
 * the figure first, its wording behind it, each row a beat later than the last.
 * `TextEngine` per run rather than a single one over the row, because the
 * figure and its wording are different colours and the engine owns its own
 * markup. No `overflow`: the plate is set on `leading-cap` (0.72) and a clip at
 * that leading shaves the letters.
 */
export const SeasonPlate = ({ badge, stats, className }: SeasonPlateProps) => (
  <Spring
    tag="div"
    mode="forward"
    enabled
    config={REVEAL_CONFIG}
    delayIn={PLATE_DELAY}
    from={PLATE_FROM}
    to={PLATE_TO}
    className={`relative grid ${className ?? ""}`}
    style={{
      // The frame's 277x78 is measured against type that has not been
      // floored. Once it is, the badge and the three figures outgrow the box
      // and the outline cuts through them.
      // **Sized to its content below `lg`, not to a guessed width.** The
      // frame's 277x78 is measured against unfloored type; floored, the
      // wording no longer fits and every width I picked for it was either
      // still too tight or left a third of the plate empty. `max-content`
      // lets the plate be exactly as wide as its three rows need, and the
      // outline is `size-full`, so it follows.
      // Below `lg` every one of these is the frame's own number in real
      // pixels, so the card is the 1440 card at its drawn size rather than a
      // share of a narrower block — one element, all its parts, nothing
      // resized independently of the rest.
      width: `var(--plate-w, ${px(PLATE.width)})`,
      height: `var(--plate-h, ${px(PLATE.height)})`,
      gridTemplateColumns: `var(--plate-cell, ${px(PLATE.divider)}) 1fr`,
    }}
  >
    {/* First in the DOM and out of flow, so it paints under the two cells,
        which carry `relative` to stay above it. */}
    <svg
      viewBox={`0 0 ${PLATE.width} ${PLATE.height}`}
      className="pointer-events-none absolute inset-0 size-full"
      stroke="var(--accent)"
      strokeWidth={1}
      vectorEffect="non-scaling-stroke"
      aria-hidden
    >
      <path d={OUTLINE} fill="var(--surface-black)" />
      <line
        x1={PLATE.divider}
        y1={0}
        x2={PLATE.divider}
        y2={PLATE.height}
        vectorEffect="non-scaling-stroke"
      />
    </svg>

    <div
      className="relative flex flex-col items-center justify-center"
      style={{ gap: `var(--plate-badge-gap, ${px(PLATE.badgeGap)})` }}
    >
      <SeasonGlobe
        className="block"
        style={{
          width: `var(--plate-globe-w, ${px(PLATE.globe.width)})`,
          height: `var(--plate-globe-h, ${px(PLATE.globe.height)})`,
        }}
      />
      <span
        className="flex gap-[0.3em] leading-cap tracking-eyebrow"
        style={{ fontSize: `var(--plate-eyebrow, ${type(12)})` }}
      >
        <TextEngine
          tag="span"
          mode="forward"
          enabled
          delayIn={TYPE_DELAY}
          letterStagger={LETTER_STAGGER}
          letterOut={LETTER_OUT}
          letterIn={LETTER_IN}
          letterConfig={TYPE_CONFIG}
          className="justify-start text-foreground-on-dark"
        >
          {badge.series}
        </TextEngine>
        <TextEngine
          tag="span"
          mode="forward"
          enabled
          delayIn={TYPE_DELAY + 60}
          letterStagger={LETTER_STAGGER}
          letterOut={LETTER_OUT}
          letterIn={LETTER_IN}
          letterConfig={TYPE_CONFIG}
          className="justify-start text-accent"
        >
          {badge.season}
        </TextEngine>
      </span>
    </div>

    <dl
      className="relative flex flex-col justify-center uppercase leading-cap"
      style={{
        gap: `var(--plate-stats-gap, ${px(PLATE.statsGap)})`,
        paddingLeft: `var(--plate-stats-left, ${px(PLATE.statsLeft)})`,
        fontSize: `var(--plate-body, ${type(14)})`,
      }}
    >
      {stats.map((stat, index) => (
        // The figure is the term and the wording describes it — "P1", "in the
        // championship" — so the design's order is also the reading order.
        <div key={stat.label} className="flex gap-[0.35em]">
          <dt className="shrink-0 text-accent">
            <TextEngine
              tag="span"
              mode="forward"
              enabled
              delayIn={TYPE_DELAY + index * ROW_STAGGER}
              letterStagger={LETTER_STAGGER}
              letterOut={LETTER_OUT}
              letterIn={LETTER_IN}
              letterConfig={TYPE_CONFIG}
              className="justify-start"
            >
              {stat.value}
            </TextEngine>
          </dt>
          {/* `grow` so the wording takes what the row has left. Without it
              the term and the description both sized to their own content and
              "in the championship" wrapped inside 122px while 100 sat unused
              beside it. */}
          <dd className="grow whitespace-nowrap text-foreground-on-dark">
            <TextEngine
              tag="span"
              mode="forward"
              enabled
              delayIn={TYPE_DELAY + index * ROW_STAGGER + 70}
              letterStagger={LETTER_STAGGER}
              letterOut={LETTER_OUT}
              letterIn={LETTER_IN}
              letterConfig={TYPE_CONFIG}
              className="flex-nowrap justify-start whitespace-nowrap"
            >
              {stat.label}
            </TextEngine>
          </dd>
        </div>
      ))}
    </dl>
  </Spring>
);
