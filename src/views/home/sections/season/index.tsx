// 📖 Docs: obsidian/frontend/components/sections.md

import type { HomeContent } from "@/data/mocks/home";

import { GUTTER, px } from "./geometry";
import { SeasonCircuit } from "./season-circuit";
import { SeasonDissolve } from "./season-dissolve";
import { SeasonHeading } from "./season-heading";
import { SeasonPlate } from "./season-plate";

export interface SeasonProps {
  content: HomeContent["season"];
  className?: string;
}

/**
 * "The season so far" — the page's second block, and its first dark surface.
 * The circuit fills from the chequered flag over one lap when the block
 * arrives; see `season-circuit.tsx` for how the trace and its ASCII edge work.
 *
 * The backdrop is cover-fitted from a fixed 1440x800 artboard so the trace can
 * never drift off the map, but the copy is *not* — it sits in the page's own
 * responsive gutters, so the headline and the plate keep the same margins as
 * the hero above them instead of drifting with the crop.
 *
 * The seam with the hero above is `<SeasonDissolve/>`: the light surface
 * carries in, breaks into a chequered flag and burns off as the block seats.
 */
export const Season = ({ content, className }: SeasonProps) => (
  <section
    // `data-season`: between 1441 and 1920 the root is based on 1920, so this
    // block — the one written in rem rather than `cqw` — needs its own base
    // back or it reads a third smaller than the timeline under it. See the
    // band in `globals.css`, and `px()` in `./geometry`.
    data-season
    className={`@container relative isolate min-h-[var(--season-h,100lvh)] overflow-hidden bg-surface-black text-foreground-on-dark max-lg:[--gutter-min:32px] max-lg:[--type-min:13px] max-lg:[--copy-min-size:17px] max-lg:[--copy-min-w:15rem] max-lg:[--head-min:6.6667cqw] max-sm:[--head-min:40px] max-sm:[--head-air:20px] max-sm:[--season-h:680px] max-lg:[--plate-w:277px] max-lg:[--plate-h:78px] max-lg:[--plate-cell:83px] max-lg:[--plate-badge-gap:11px] max-lg:[--plate-globe-w:37px] max-lg:[--plate-globe-h:23px] max-lg:[--plate-stats-left:16px] max-lg:[--plate-stats-gap:8px] max-lg:[--plate-eyebrow:12px] max-lg:[--plate-body:14px] ${className ?? ""}`}
  >
    <SeasonCircuit />
    <SeasonDissolve className="max-sm:z-0" />

    {/* The gutters travel with the block's own base too, so its left edge
        keeps landing on the same line as the timeline's and the paddock's
        rather than drifting 8px in of them at 1512. */}
    <div
      // **The column, not the section.** The block is a pinned layer of the
      // stack and the one behind it is the hero, which is light: a section
      // shorter than the screen left that light showing under it as a band
      // while the block was pinned. So the *section* keeps the screen — the
      // map fills it and the ground stays black — and only the composition
      // inside is drawn shorter, which is what the phone needed.
      className="relative flex min-h-[var(--season-h,100lvh)] flex-col justify-between gap-16 px-6 pb-8 sm:px-[var(--season-gutter)] sm:pb-[var(--season-gutter)]"
      style={
        {
          // The frame's 32 is a share of the block's width, which on a 768
          // screen is 16 real pixels — half the air the plate and the copy
          // are drawn with. `max()` against a floor the section sets keeps
          // the frame's own number where the block is wide and a real 32
          // where it is not.
          "--season-gutter": `max(${px(GUTTER)}, var(--gutter-min, 0px))`,
          paddingTop: px(70),
        } as React.CSSProperties
      }
    >
      <SeasonHeading headline={content.headline} intro={content.intro} />
      <SeasonPlate
        badge={content.badge}
        stats={content.stats}
        className="self-end"
      />
    </div>
  </section>
);
