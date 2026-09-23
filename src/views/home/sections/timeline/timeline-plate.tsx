"use client";

// 📖 Docs: obsidian/frontend/components/sections.md

import { useId, type CSSProperties, type ReactNode } from "react";

import { SpringTrigger } from "@/components/animation/springs/spring-trigger";

import { PLATE_CLIP, PLATE_OUTLINE, PLATE_VIEW } from "./plate-shape";

export interface TimelinePlateProps {
  /** Whatever goes in the frame. Empty until the images land. */
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/**
 * How far the slot's content rides, as a share of its own height.
 *
 * It travels on `top`, not on a transform, and that is not a preference. Two
 * routes were tried and both fail silently:
 *
 * - react-spring's `y` shorthand builds `translate3d` from numbers and resolves
 *   a percentage string to `transform: none`.
 * - A whole `transform: translateY(-30%)` goes through the trigger's own
 *   `interpolate` (`src/utils/math.ts`), whose transform-function branch
 *   rebuilds the value as `translateY(-15(%)` — a stray bracket, invalid CSS,
 *   so react-spring holds the last value it could parse and the parallax looks
 *   frozen at its start.
 *
 * `interpolate`'s plain-unit branch is correct, so a bare `-30%` on `top` is
 * the route that actually animates. The slot content is `size-full`, so a
 * percentage of its containing block is a percentage of its own height.
 */
const PARALLAX_FROM = { top: "-10%" };
const PARALLAX_TO = { top: "0%" };

/**
 * One frame on the timeline.
 *
 * The outline never moves; the **slot** inside it does. Two things act on it,
 * both taken off the reference:
 *
 * - **Parallax.** The slot's content travels from -10% of its own height to 0
 *   as the frame comes up the screen, then holds. Linear across a window that
 *   starts with the frame's top around 0.88vh and finishes around 0.36vh,
 *   which is `top bottom` to `top center`. It is a scrub, not an entrance:
 *   scrolling back up rewinds it.
 *
 *   The reference runs **30%** — measured at 1440x900, `translateY` of -140.5px
 *   on a 468px frame. That was the figure while these frames were empty. It
 *   cannot survive a photograph: travel needs the content taller than the
 *   frame, the plates are 1.537 wide-to-tall and the supplied photographs are
 *   about 1.5, so a 30% overscan had `object-cover` zooming in and cutting the
 *   sides off every one of them — the 2012 frame lost most of its tent. 10% is
 *   what the source images actually carry, and at rest the crop is Figma's.
 * - **Hover.** The slot insets by 5% while the outline stays put, so the fill
 *   pulls away from its own frame. The reference does this on `clip-path` with
 *   a 700ms `cubic-bezier(0.33, 0, 0, 1)`; here it is `inset`, because the
 *   frame is a shaped clip rather than a rectangle and `clip-path: url()`
 *   cannot be transitioned. Insetting the box scales the shape with it, which
 *   is the same read.
 *
 * Both are CSS transitions rather than springs — hover and inset are trivial
 * state, and the parallax is the project's own scroll spring. See
 * [[animation-system]].
 */
export const TimelinePlate = ({
  children,
  className,
  style,
}: TimelinePlateProps) => {
  // Ten of these share a page, and duplicate fragment ids cross-wire the clips.
  const clipId = `plate-${useId().replace(/:/g, "")}`;

  return (
    <div
      data-timeline-plate
      // `relative size-full`, never positioned: the caller owns placement, and
      // a `relative` here fought an `absolute` passed in through `className`.
      className={`group/plate pointer-events-auto relative size-full ${className ?? ""}`}
      style={style}
    >
      <svg width="0" height="0" className="absolute" aria-hidden>
        <defs>
          <clipPath id={clipId} clipPathUnits="objectBoundingBox">
            <path d={PLATE_CLIP} />
          </clipPath>
        </defs>
      </svg>

      {/* The fill and whatever is dropped into it, clipped to the frame's own
          curve. `inset` rather than a transform so the clip scales with the
          box instead of the shape being squashed inside a fixed one. */}
      <div
        className="absolute inset-0 overflow-hidden bg-timeline-fill transition-[inset] duration-[var(--duration-plate)] ease-plate group-hover/plate:inset-[5%]"
        style={{ clipPath: `url(#${clipId})` }}
      >
        {/* `SpringTrigger` measures its own outer element and animates the
            inner one, so the slot is the trigger and its content is what
            travels. */}
        <SpringTrigger
          start="top bottom"
          end="top center"
          mode="scrub"
          from={PARALLAX_FROM}
          to={PARALLAX_TO}
          className="block size-full"
          innerClassName="relative block size-full"
        >
          {children}
        </SpringTrigger>
      </div>

      {/* The outline, at the coordinates the design set. `preserveAspectRatio`
          is off because the two plate sizes are the same curve at 2.13x and
          the box is authored to match; the stroke stays hairline regardless. */}
      <svg
        viewBox={`0 0 ${PLATE_VIEW.width} ${PLATE_VIEW.height}`}
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-0 size-full"
        aria-hidden
      >
        <path
          d={PLATE_OUTLINE}
          fill="none"
          stroke="var(--timeline-outline)"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
};
