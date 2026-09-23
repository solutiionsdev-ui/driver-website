// 📖 Docs: obsidian/frontend/components/common.md

/**
 * Adaptive scaling grid configuration.
 *
 * The grid keeps a rem-based design proportional across viewports by scaling
 * the root (`<html>`) font-size. Each breakpoint maps a viewport `maxWidth` to
 * the design `baseWidth` it was laid out at — at `baseWidth` the root
 * font-size equals `FONT_BASE` and rem values match the design 1:1.
 *
 * - Scaling DOWN (viewport at or below `GRID_BASE_WIDTH`) is driven by the
 *   `vw` media queries in `src/app/globals.css`.
 * - Scaling UP (viewport above `GRID_BASE_WIDTH`) is driven at runtime by the
 *   `AdaptiveGrid` component / `useAdaptiveGrid` hook.
 *
 * Changing these values means updating the `html` media queries in
 * `globals.css` to match — the formula is:
 *   font-size: FONT_BASE * 100 / baseWidth  (vw)
 *
 * A `baseWidth` of `null` means the range does not scale at all: it holds the
 * root font-size at `FONT_BASE`. Below `lg` that is deliberate — see
 * ADR-0024 in `obsidian/meta/decisions-log.md`.
 */

/** Root font-size (px) the design is measured against. */
export const FONT_BASE = 16;

export interface GridBreakpoint {
  /** Media-query `max-width` threshold (px). */
  maxWidth: number;
  /** Design base width (px) the range was laid out at, or `null` when the
   *  range holds the root font-size at `FONT_BASE` instead of scaling. */
  baseWidth: number | null;
}

/** Breakpoints, largest first. */
export const GRID_BREAKPOINTS: readonly GridBreakpoint[] = [
  { maxWidth: 1920, baseWidth: 1920 },
  { maxWidth: 1440, baseWidth: 1440 },
  { maxWidth: 1279, baseWidth: null },
];

/** Largest breakpoint width — above it the root font-size scales up. */
export const GRID_BASE_WIDTH = Math.max(
  ...GRID_BREAKPOINTS.map((bp) => bp.maxWidth),
);
