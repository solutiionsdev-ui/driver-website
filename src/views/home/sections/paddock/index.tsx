// 📖 Docs: obsidian/frontend/components/sections.md

import Image from "next/image";

import type { HomeContent } from "@/data/mocks/home";
import { SpringTrigger } from "@/components/animation/springs/spring-trigger";
import { SeasonDissolve } from "@/views/home/sections/season/season-dissolve";

import { PaddockCalendar } from "./paddock-calendar";
import { PaddockIntro } from "./paddock-intro";
import { PaddockPanels } from "./paddock-panels";
import { PaddockBackdrop } from "./paddock-backdrop";
import {
  BAND,
  BAND_SCALE_NARROW,
  CAL_CARD_DROP_NARROW,
  CAL_MARK_DROP_NARROW,
  CAL_SPREAD_NARROW,
  CTA_H_NARROW,
  FIG_CAP_NARROW,
  FIG_X_NARROW,
  PARALLAX_PORTRAIT,
  PORTRAIT,
  PANEL_U_NARROW,
  MEET_FRAME_BOTTOM_NARROW,
  MEET_FRAME_LEFT_NARROW,
  MEET_TOP_NARROW,
  MEET_FRAME_RIGHT_NARROW,
  MEET_FRAME_TOP_NARROW,
  MEET_LEFT_NARROW,
  PHONE,
  STATS_COL_W_NARROW,
  STATS_FRAME_LEFT_NARROW,
  STATS_FRAME_RIGHT_NARROW,
  STATS_LEFT_NARROW,
  STATS_FRAME_DROP_NARROW,
  STATS_RULE_BOTTOM_NARROW,
  STATS_RULE_TOP_NARROW,
  px,
} from "./geometry";

export interface PaddockProps {
  content: HomeContent["paddock"];
  className?: string;
  /** In-page anchor — the nav's "next race" lands here. */
  id?: string;
}

/**
 * "From the paddock" — the page's fourth block, and its return to light.
 *
 * Ported from Figma node `1892:994` at 1:1. Like the timeline it is a
 * `@container` measured in its own width, so it is the 1440 frame at every
 * viewport rather than following the project's root-font bands, which expect a
 * design authored at each band's base and only have one here.
 *
 * The stack, bottom of the pile first: the surface, the faint drawn curves the
 * design lays over it, the dark band the calendar sits on, the portrait, and
 * then a gradient that melts the portrait's foot into that band. The order
 * matters — the band is under the portrait and the gradient is over it, which
 * is how the figure dissolves into the strip instead of being cut by it.
 */
export const Paddock = ({ content, className, id }: PaddockProps) => (
  <section
    id={id}
    // `max-xl` only, so 1280 and 1440 are untouched: below them the copy has
    // stopped shrinking with the block — the root font size is pinned at 16
    // under 1280 — while the figure kept scaling off the height, so it had
    // grown against the masthead and pushed its own head off the top.
    className={`@container relative isolate min-h-[var(--block-h,100lvh)] w-full overflow-hidden bg-background text-foreground max-lg:[--type-min:13px] max-sm:[--head-min:40px] max-lg:[--copy-min-size:17px] max-sm:[--block-h:var(--ph-block-h)] max-sm:[--intro-bottom:var(--ph-intro-bottom)] max-sm:[--head-left:var(--ph-gutter)] max-sm:[--head-top:var(--ph-head-top)] max-sm:[--intro-left:var(--ph-gutter)] max-sm:[--intro-min-w:320px] max-sm:[--intro-gap:24px] max-sm:[--band-fade:60px] max-sm:[--cta-h:50px] max-sm:[--panel-u:1px] max-sm:[--meet-left:calc(var(--ph-gutter)+13px)] max-sm:[--meet-top:var(--ph-meet-top)] max-sm:[--meet-frame-left:var(--ph-gutter)] max-sm:[--meet-frame-right:var(--ph-meet-frame-right)] max-sm:[--meet-frame-top:var(--ph-meet-frame-top)] max-sm:[--meet-frame-bottom:var(--ph-meet-frame-bottom)] max-sm:[--stats-left:calc(var(--ph-gutter)+13px)] max-sm:[--stats-frame-left:var(--ph-gutter)] max-sm:[--stats-frame-right:var(--ph-stats-frame-right)] max-sm:[--stats-col-w:var(--ph-stats-w)] max-sm:[--stats-drop:var(--ph-stats-drop)] max-sm:[--fig-cap:var(--ph-fig-cap)] max-sm:[--fig-x-override:48.5%] max-sm:[--fig-lift:var(--ph-fig-lift)] max-sm:[--band-scale:var(--ph-band-scale)] max-sm:[--cal-card-w:100%] max-lg:[--stats-row-min:42px] sm:max-lg:[--fig-cap:var(--fig-cap-narrow)] sm:max-lg:[--fig-x-override:var(--fig-x-narrow)] sm:max-lg:[--cta-h:var(--cta-h-narrow)] sm:max-lg:[--band-scale:var(--band-scale-narrow)] sm:max-lg:[--cal-spread:var(--cal-spread-narrow)] sm:max-lg:[--cal-mark-drop:var(--cal-mark-drop-narrow)] sm:max-lg:[--panel-u:var(--panel-u-narrow)] sm:max-lg:[--stats-rule-top:var(--stats-rule-top-narrow)] sm:max-lg:[--stats-rule-bottom:var(--stats-rule-bottom-narrow)] sm:max-lg:[--stats-frame-drop:var(--stats-frame-drop-narrow)] sm:max-lg:[--meet-left:var(--meet-left-narrow)] sm:max-lg:[--meet-top:var(--meet-top-narrow)] sm:max-lg:[--meet-frame-left:var(--meet-frame-left-narrow)] sm:max-lg:[--meet-frame-right:var(--meet-frame-right-narrow)] sm:max-lg:[--meet-frame-top:var(--meet-frame-top-narrow)] sm:max-lg:[--meet-frame-bottom:var(--meet-frame-bottom-narrow)] sm:max-lg:[--stats-drop:2.86cqw] sm:max-lg:[--stats-left:var(--stats-left-narrow)] sm:max-lg:[--stats-frame-left:var(--stats-frame-left-narrow)] sm:max-lg:[--stats-frame-right:var(--stats-frame-right-narrow)] sm:max-lg:[--stats-col-w:var(--stats-col-w-narrow)] sm:max-lg:[--cal-card-drop:var(--cal-card-drop-narrow)] sm:max-lg:[--intro-min-w:280px] ${className ?? ""}`}
    // The three narrow figures arrive as variables rather than as literals in
    // the class list: the constants live in `geometry` beside the frame's own
    // numbers, and the strip's scale has to be the same number in two places
    // — the band's height and the strip's own transform.
    style={
      {
        "--fig-cap-narrow": FIG_CAP_NARROW,
        "--fig-x-narrow": FIG_X_NARROW,
        "--cta-h-narrow": CTA_H_NARROW,
        "--band-scale-narrow": BAND_SCALE_NARROW,
        "--ph-block-h": PHONE.blockH,
        "--ph-intro-bottom": PHONE.introBottom,
        "--ph-gutter": PHONE.gutter,
        "--ph-head-top": PHONE.headTop,
        "--ph-meet-top": PHONE.meetTop,
        "--ph-meet-frame-top": PHONE.meetFrameTop,
        "--ph-meet-frame-bottom": PHONE.meetFrameBottom,
        "--ph-meet-frame-right": PHONE.meetFrameRight,
        "--ph-stats-w": PHONE.statsW,
        "--ph-stats-frame-right": PHONE.statsFrameRight,
        "--ph-stats-drop": PHONE.statsDrop,
        "--ph-fig-cap": PHONE.figCap,
        "--ph-fig-lift": PHONE.figLift,
        "--ph-band-scale": PHONE.bandScale,
        "--cal-spread-narrow": CAL_SPREAD_NARROW,
        "--cal-mark-drop-narrow": CAL_MARK_DROP_NARROW,
        "--panel-u-narrow": PANEL_U_NARROW,
        "--stats-rule-top-narrow": STATS_RULE_TOP_NARROW,
        "--stats-rule-bottom-narrow": STATS_RULE_BOTTOM_NARROW,
        "--stats-frame-drop-narrow": STATS_FRAME_DROP_NARROW,
        "--stats-col-w-narrow": STATS_COL_W_NARROW,
        "--stats-left-narrow": STATS_LEFT_NARROW,
        "--stats-frame-left-narrow": STATS_FRAME_LEFT_NARROW,
        "--stats-frame-right-narrow": STATS_FRAME_RIGHT_NARROW,
        "--meet-left-narrow": MEET_LEFT_NARROW,
        "--meet-top-narrow": MEET_TOP_NARROW,
        "--meet-frame-left-narrow": MEET_FRAME_LEFT_NARROW,
        "--meet-frame-right-narrow": MEET_FRAME_RIGHT_NARROW,
        "--meet-frame-top-narrow": MEET_FRAME_TOP_NARROW,
        "--meet-frame-bottom-narrow": MEET_FRAME_BOTTOM_NARROW,
        "--cal-card-drop-narrow": CAL_CARD_DROP_NARROW,
      } as React.CSSProperties
    }
  >
    {/* The hero's own animated contours rather than the design's static SVG —
        the hero made the same call, and its comment says why. */}
    <PaddockBackdrop className="absolute inset-0 z-0" />

    <div
      className="absolute inset-x-0 bottom-0 z-0 h-[calc(var(--band)*var(--band-scale,1))] bg-surface-black"
      style={{ "--band": px(BAND.height) } as React.CSSProperties}
    />

    {/* Sized off the block's height so the figure keeps bleeding off both ends
        however tall the screen is, exactly as the design hangs it. */}
    {/* Scroll parallax. The layer is `absolute inset-0` so it measures the
        whole block as its own trigger and, covering the section exactly, is a
        containing block the figure's percentages resolve against identically —
        the placement below is untouched. It travels on `top` against a
        `relative` inner for the reason `timeline-plate` sets out: react-spring
        resolves a percentage `y` to `transform: none`, and a whole `transform`
        is mangled by the trigger's own `interpolate`. See `PARALLAX_PORTRAIT`
        for why it only ever goes up. */}
    <SpringTrigger
      start="top bottom"
      end="bottom top"
      mode="scrub"
      from={{ top: "0cqw" }}
      to={{ top: `-${px(PARALLAX_PORTRAIT)}` }}
      className="pointer-events-none absolute inset-0 z-10"
      innerClassName="relative block size-full"
    >
      <Image
        src="/assets/paddock/portrait.webp"
        alt="Kimi Antonelli in the paddock"
        width={1350}
        height={1165}
        priority
        // Sized off the block's height so the figure keeps bleeding off both
        // ends however tall the screen is, exactly as the design hangs it.
        // `--fig-fit` is 1 at 1280 and up and pulls it back below that, where
        // the block's own copy has not shrunk with it.
        // Below `lg` the figure is sized off the **width**, not the section's
        // height. Height-driven on a portrait screen it kept growing as the
        // block got taller — at 768x1024 the portrait came out over a thousand
        // pixels tall in a 768 frame and swallowed the copy.
        className="pointer-events-none absolute bottom-[var(--fig-y)] z-10 h-[var(--fig-h)] w-auto max-w-none -translate-x-1/2 select-none object-cover left-[var(--fig-x)] aspect-[var(--fig-a)]"
        // `aspect-ratio` rather than a computed width: the height is a share of
        // the section and a width percentage would be a share of its *width*,
        // which is a different number.
        style={
          {
            // Read through an override variable: `--fig-x` is set inline here
            // and an inline declaration beats any class, so a narrow value has
            // to arrive from inside this value rather than beside it.
            "--fig-x": `var(--fig-x-override, ${PORTRAIT.centre * 100}%)`,
            // `min()`: the ceiling is inert unless a width sets it, so the
            // frame's own height-driven sizing stands wherever the block is
            // still landscape.
            "--fig-h": `min(calc(${PORTRAIT.heightShare * 100}% * var(--fig-fit, 1)), var(--fig-cap, 100000px))`,
            "--fig-a": `${PORTRAIT.aspect}`,
            "--fig-y": "var(--fig-lift, 0px)",
          } as React.CSSProperties
        }
      />
    </SpringTrigger>

    {/* Over the portrait: the foot of the figure melts into the band. */}
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[calc(var(--band)*var(--band-scale,1))]"
      style={
        {
          "--band": px(BAND.height),
          // The fade is a share of the band from `lg` up and a **fixed run**
          // below it: the phone's panel is ten times the frame's band, so the
          // same 38.7% would have taken 200 to swallow the figure and the
          // report would have started on top of it.
          backgroundImage: `linear-gradient(to bottom, rgb(9 10 11 / 0) 0%, var(--surface-black) var(--band-fade, ${BAND.fade}%))`,
        } as React.CSSProperties
      }
    />

    {/* The seam with the timeline above, in the page's own language: the same
        chequered flag that joins the hero to the season block, carrying the
        dark surface down into this light one instead of the other way round. */}
    <SeasonDissolve carry="dark" className="z-30 max-sm:z-0" />

    <PaddockIntro
      headline={content.headline}
      intro={content.intro}
      cta={content.cta}
    />
    <PaddockPanels meet={content.meet} stats={content.stats} />
    <PaddockCalendar rounds={content.calendar} />
  </section>
);
