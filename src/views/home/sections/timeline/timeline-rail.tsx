"use client";

// 📖 Docs: obsidian/frontend/components/sections.md

import { useMemo, useRef } from "react";
import { animated } from "@react-spring/web";

import { useSpringTrigger } from "@/hooks/animation/use-spring-trigger";
import { useWindowWidth } from "@/hooks/use-window-size";

import {
  MARK_SIZE,
  MARK_SIZE_NARROW,
  NARROW_UNDER,
  RAIL_DASH,
  RAIL_GAP,
  RAIL_SOLID,
  RAIL_START,
  RAIL_WIDTH,
  TOP_PAD,
  px,
} from "./geometry";

/**
 * How far the marker turns over the whole rail. Read off the reference at
 * **48.65 degrees per 100 scrolled pixels** — dead constant across equal steps
 * and frozen the moment scrolling stops, so it rides scroll *position*, not
 * velocity. Over this block's own rail that comes to five turns, which is the
 * number kept here: tying it to turns rather than to degrees-per-pixel means
 * the marker still completes its run at any viewport width.
 */
const SPIN = 360 * 5;

const FROM = { p: 0 };
const TO = { p: 1 };

/** The rail's centre line, in its own coordinates. */
const MID = RAIL_WIDTH / 2;

export interface TimelineRailProps {
  /** The rail's full run, lead-in included, in design px. */
  height: number;
  /**
   * Where the run finishes, as a share of the rail. **Not 1.** The design rests
   * its marker on the last entry — 50 above that row's middle, the offset every
   * one of its drawn markers sits at — rather than running the thread out to
   * the bottom of the block. `geometry.ts` works the number out.
   */
  runTo: number;
}

/**
 * The rail, and the thread that runs down it.
 *
 * Three layers, all three from the reference — the first pass shipped only the
 * track and the block sat still: the **track**, solid for its designed run and
 * dashed the rest of the way; a **progress line** in white that grows down it;
 * and a **marker** at that line's tip, turning as it goes. The line's tip
 * tracks the middle of the viewport, so the marker is at eye level and the
 * white behind it is how far you have read.
 *
 * **One SVG, one spring, one paint** — and that is the fix for the marker
 * appearing to come apart in two while it moved. It used to be a CSS-rotated
 * `<span>` hung off the bottom of a `<div>` whose *height* animated: a layout
 * property changing every frame, inside a `mask-image` compositing layer, with
 * a transform on the child. The geometry was never wrong — measured through a
 * real wheel gesture, the gap between the line's tip and the marker's centre
 * was 0.00 on every sample — but nothing about that arrangement guarantees the
 * two are rasterised from the same frame. Drawn as two `<rect>`s in one SVG off
 * one interpolation, they cannot separate: there is no layout to lag and no
 * second layer to fall behind.
 *
 * The rail starts at `RAIL_START` — the block's own top edge, which is where
 * Figma draws it from. It briefly led in 260 above the block, into the tail of
 * the section before it, so the thread crossed the seam.
 *
 * **Below `NARROW_UNDER` it starts at the first photograph instead.** There
 * the masthead is centred rather than set out in its own gutter, and a thread
 * running from the block's top edge went straight down through it — reading
 * as a rule struck through the type, and starting the run a screen before
 * there was anything for it to measure. Everything the SVG draws is measured
 * from `origin`, so the box, the resting point and the marker's turn all move
 * together; splitting them is what put the marker off the line's tip the
 * first time this was tried.
 */
export const TimelineRail = ({ height, runTo }: TimelineRailProps) => {
  const railRef = useRef<HTMLDivElement>(null);
  const narrow = useWindowWidth() < NARROW_UNDER;

  /** Where the thread begins, in design px from the block's top. */
  const origin = narrow ? TOP_PAD : RAIL_START;
  /**
   * The box the SVG draws into, in the same units. The extra air the narrow
   * port opens above the rows is *not* in it: the box runs from the first
   * photograph to the foot of the last row either way, and the offset takes
   * the padding along through `--top-pad-extra`. One unit of the viewBox is
   * one design pixel, which is what keeps the marker square.
   */
  const viewH = height - origin;
  /** The resting point, moved into the box's own coordinates. */
  const rest = runTo * height - origin;
  const mark = narrow ? MARK_SIZE_NARROW : MARK_SIZE;

  const { interpolatedProgress } = useSpringTrigger({
    elementRef: railRef,
    start: "top center",
    // **`bottom bottom`, not `bottom center`.** The reference ends its run when
    // the rail's bottom reaches the fold, which keeps the tip at eye level the
    // whole way — but it can only do that because more page follows. This rail
    // ends *with the document*, and a page stops scrolling once its bottom
    // reaches the bottom of the window, so the last half-viewport is
    // unreachable: the line finished 450 short of its own end on a 900 window.
    // Put `bottom center` back the moment a block lands underneath this one.
    end: "bottom bottom",
    mode: "scrub",
    from: FROM,
    to: TO,
  });

  const run = useMemo(
    () => interpolatedProgress.to((value) => value * rest),
    [interpolatedProgress, rest],
  );

  return (
    <div
      ref={railRef}
      aria-hidden
      // From `xl` the thread starts at the block's own top edge, which is
      // where Figma draws it. Below that it starts **at the first photograph**
      // instead: on a narrow screen the masthead has moved to the centre and a
      // line running down through it read as striking the type out.
      className="pointer-events-none absolute bottom-0 left-1/2 z-10 w-[var(--rail-w)] -translate-x-1/2 top-[var(--rail-top)] max-sm:hidden"
      style={
        {
          // No lead-in and no fade at the top: from `xl` the rail begins at the
          // block's own top edge, which is where Figma draws it, and the block
          // itself arrives over the one before it — so there is no seam left
          // for the thread to carry. Below `xl` it begins at the **first
          // photograph** instead, because the masthead has moved to the centre
          // of the block and a line through it read as striking the type out.
          // `calc`, not a second constant: the narrow port's extra air is a
          // share of the width set in CSS, and the thread has to start at the
          // photograph it actually pushed down to.
          "--rail-top": narrow
            ? `calc(${px(TOP_PAD)} + var(--top-pad-extra, 0px))`
            : px(RAIL_START),
          "--rail-w": px(RAIL_WIDTH),
        } as React.CSSProperties
      }
    >
      {/* `overflow-visible`: the marker turns, and a square wider than the
          rail's own 16 swings its corners past the box on the way round. */}
      <svg
        viewBox={`0 0 ${RAIL_WIDTH} ${viewH}`}
        className="block size-full overflow-visible"
      >
        {/* The track. The lead-in carries the dash up into the block above;
            inside the block it is the design's own solid run, a gap, then
            dashes to the end. */}
        <g stroke="var(--timeline-rail)" strokeWidth={1}>
          <line x1={MID} y1={0} x2={MID} y2={RAIL_SOLID} />
          {/* Stops where the marker rests, not at the foot of the block —
              Figma draws the line to 2387 in a 2700 frame, which is the
              resting point exactly. Below it the last plate stands alone. */}
          <line
            x1={MID}
            y1={RAIL_SOLID + RAIL_GAP}
            x2={MID}
            y2={rest}
            strokeDasharray={`${RAIL_DASH} ${RAIL_DASH}`}
          />
        </g>

        <animated.rect
          x={MID - 0.5}
          y={0}
          width={1}
          height={run}
          fill="var(--foreground-on-dark)"
        />
        <animated.rect
          x={-mark / 2}
          y={-mark / 2}
          width={mark}
          height={mark}
          fill="var(--foreground-on-dark)"
          transform={run.to(
            (value) =>
              `translate(${MID} ${value}) rotate(${(value / rest) * SPIN})`,
          )}
        />
      </svg>
    </div>
  );
};
