// 📖 Docs: obsidian/frontend/components/sections.md

import type { HomeContent } from "@/data/mocks/home";

import { SeasonDissolve } from "@/views/home/sections/season/season-dissolve";

import { TimelineHeading } from "./timeline-heading";
import {
  BOTTOM_PAD,
  BOTTOM_PAD_NARROW,
  GUTTER,
  masthead,
  HEAD_TOP_NARROW,
  TOP_PAD,
  TOP_PAD_NARROW,
  px,
  type,
  railHeight,
  restingPoint,
} from "./geometry";
import { TimelineRail } from "./timeline-rail";
import { TimelineRow } from "./timeline-row";

export interface TimelineProps {
  content: HomeContent["timeline"];
  className?: string;
}

/**
 * "From karts to F1" — the career timeline.
 *
 * Ported from the 1440x2700 frame at 1:1, in `cqw` off the section's own width
 * so a design pixel stays one at any viewport — see `px()` in `./geometry`.
 *
 * The rows stack with **no gap at all**: a 462-tall centre row, then a 217-tall
 * side row, ending on a centre row. 4 x 462 + 3 x 217 = 2499, plus the 169
 * above and the 32 below, is the frame's 2700 to the pixel — which is how you
 * can tell the design was built as a stack rather than as free-floating
 * plates. A row is `./timeline-row`, which is where the photographs, the year
 * and the copy live.
 */

export const Timeline = ({ content, className }: TimelineProps) => (
  <section
    // `@container`: everything below measures itself against this width.
    // `@container`: everything below measures itself against this width.
    // Below `xl` the gutter is a real 1rem rather than a share of the width,
    // and the left one opens to 2.5rem so the rail has a lane of its own.
    // `--head-top`, between `sm` and `lg`: **the block's own bottom pad**, so
    // the air above the masthead is the air below the last photograph — 80
    // real pixels either end at 768, against the gutter's 17 before. The
    // `--top-pad-extra` above it grows by the same 63 plus the masthead's own
    // two lines, which is where 16cqw comes from: it keeps the 35 the
    // masthead had over the first plate rather than dropping onto it.
    // `--year-min`: the year is 36 against a 1440 block, and a share of 768
    // puts it at 19 over a photograph. The floor is 30 — under the narrow
    // masthead's 51 and over the copy's 17, which is the order they read in
    // on the frame.
    // `--copy-max-w`, from `sm`: the copy column's floor is a flat 200px and
    // its left edge a share of the width, so at the bottom of the port's
    // range the two together ran the column 27px past the right gutter. The
    // ceiling is exactly what the frame leaves between the column's x and
    // that gutter — 1440 - 1020 - 32 — so it binds only where the floor has
    // overtaken the design and is inert everywhere else, 1440 included.
    // `overflow-x: clip` below `lg` — **not** `hidden`, which would make this
    // a scroll container and kill the sticky stack above it. The side plates
    // are meant to run off the edge there, and without a clip they took the
    // whole document 64px wider than the viewport: the page scrolled
    // sideways, and every fixed overlay on it — the menu sheet, the dev
    // panel — read as shifted and cut.
    className={`group/timeline @container relative isolate w-full bg-surface-black pb-[var(--bottom-pad)] text-foreground-on-dark max-lg:overflow-x-clip max-lg:[--copy-min-size:17px] max-lg:[--head-min:6.6667cqw] max-sm:[--head-min:40px] max-lg:[--head-w-min:82cqw] max-sm:[--top-pad-extra:15cqw] sm:max-lg:[--top-pad-extra:16cqw] sm:max-lg:[--head-top:var(--bottom-pad)] max-lg:[--year-min:30px] max-lg:[--copy-min-w:200px] max-sm:[--copy-min-w:320px] max-sm:[--gutter-min:24px] sm:[--copy-max-w:26.9444cqw] ${className ?? ""}`}
    style={
      {
        // The frame's 32 is 8.7 real pixels on a phone — the images ran
        // almost edge to edge and the copy with them. A floor puts the block
        // back on a phone's own margin.
        "--gutter": `max(${px(GUTTER)}, var(--gutter-min, 0px))`,
        "--bottom-pad": px(BOTTOM_PAD),
        "--bottom-pad-narrow": px(BOTTOM_PAD_NARROW),
      } as React.CSSProperties
    }
  >
    {/*
      The rows are a *stack*: it closes only because the side plate's right
      edge meets the centre plate's left one — 32 + 333 = 365 = (1440 - 710)/2.
      Measuring every length off the block's own width is what keeps that true
      at any viewport. In rem it held at 1440 and nowhere else: at 1920 the
      side plate ended at 365 while the centre plate began at 605, and the copy
      landed at 1020, inside the plate.
    */}
    {/* `TOP_PAD`, not a literal: `railHeight()` and `restingPoint()` both
        measure from it, so a second copy here drifts the rail off the rows
        the moment the frame changes — which is exactly what happened when
        the block went from a 3461 frame to a 2700 one. */}
    {/* The same chequered seam the season block carries, on top of the stack's
        own pin-and-recede. `carry="light"`: between the hero and the season the
        flag is cut from the light surface above it, and this seam has to read
        as the same object — both blocks here are the same near-black, so a
        dark flag would be invisible against them. `z-30` because the rows sit
        on `z-20` and the flag has to come apart *over* them. */}
    <SeasonDissolve carry="light" z={30} className="max-sm:z-0" />

    <div
      // The extra is 0 unless the section sets it. It does below `lg`, where
      // the masthead is centred over the first photograph rather than set
      // beside it in its own gutter, and needs the room the frame does not
      // leave for it. Twice over, at two amounts: the column stacks the
      // masthead on top of everything and takes 15, while the port between
      // `sm` and `lg` only has to clear the first plate — the masthead is
      // held at the site's one narrow size there and breaks to two lines, so
      // the frame's own 169 left it sitting across the photograph.
      className="relative w-full pt-[calc(var(--top-pad)+var(--top-pad-extra,0px))] max-sm:flex max-sm:flex-col max-sm:gap-10 max-sm:px-[var(--gutter)]"
      style={
        {
          "--top-pad": px(TOP_PAD),
          "--top-pad-narrow": px(TOP_PAD_NARROW),
        } as React.CSSProperties
      }
    >
      <TimelineRail
        height={railHeight(content.entries)}
        runTo={restingPoint(content.entries)}
      />

      {/* Right-aligned in its own gutter from `xl`, as the frame has it, and
          **centred** below that: at 1280 and under the block's own left half
          is the first photograph's, and a masthead pinned to the right edge
          of a narrow screen read as belonging to nothing. */}
      <TimelineHeading
        headline={content.headline}
        // Centred below `lg`, and **left at the gutter on a phone**: at the
        // masthead's own size there it runs the width of the screen, and
        // centred it ran under the page's menu badge in the top right.
        className="absolute z-20 top-[var(--head-top,var(--gutter))] w-[var(--head-w)] right-[var(--gutter)] max-lg:left-1/2 max-lg:right-auto max-lg:-translate-x-1/2 max-sm:left-[var(--gutter)] max-sm:w-auto max-sm:translate-x-0"
        style={
          {
            "--head-top-narrow": px(HEAD_TOP_NARROW),
            // The frame's own 293 from `xl`; below it the line is set whole
            // and needs the room, so it takes the block's middle two thirds.
            // The frame's 293 is measured against 55; at the floor's 51 in a
            // 768 block the line needs more than the 156 that share comes to,
            // and the engine lays its words out with no shrink, so it ran 97px
            // past the screen. `max()` again — the box is inline, so the
            // override has to be inside its value.
            "--head-w": `max(${px(293)}, var(--head-w-min, 0px))`,
            "--head-w-narrow": px(960),
            fontSize: masthead(55),
          } as React.CSSProperties
        }
      />

      {content.entries.map((entry, index) => (
        <TimelineRow
          key={`${entry.year}-${index}`}
          entry={entry}
          index={index}
        />
      ))}
    </div>
  </section>
);
