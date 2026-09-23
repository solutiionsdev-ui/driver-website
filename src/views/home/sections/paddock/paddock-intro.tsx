"use client";

// 📖 Docs: obsidian/frontend/components/sections.md

import Link from "next/link";
import TextEngine from "spring-text-engine";

import { Spring } from "@/components/animation/springs/spring";
import type { HomeContent } from "@/data/mocks/home";

import type { CSSProperties } from "react";

import {
  ARROW_PATH,
  BAND,
  CTA,
  CTA_PATH,
  GUTTER,
  INTRO,
  px,
  type,
} from "./geometry";

export interface PaddockIntroProps {
  headline: HomeContent["paddock"]["headline"];
  intro: HomeContent["paddock"]["intro"];
  cta: HomeContent["paddock"]["cta"];
}

const REVEAL_CONFIG = { tension: 90, friction: 26 };
const COPY_CONFIG = { tension: 150, friction: 24 };
const LINE_STAGGER = 130;

// Module constants, not JSX literals: a fresh object per render re-seeds the
// animation mid-flight.
const WORD_OUT = { opacity: 0, y: "0.35em" };
const WORD_IN = { opacity: 1, y: "0em" };
const FADE_FROM = { opacity: 0 };
const FADE_TO = { opacity: 1 };
const RISE_FROM = { opacity: 0, transform: "translateY(0.75rem)" };
const RISE_TO = { opacity: 1, transform: "translateY(0rem)" };

/** The button's own height, and everything in it as a ratio of that. */
const CTA_H = `var(--cta-h, ${px(CTA.height)})`;
const CTA_W = `calc(${CTA_H} * ${CTA.width / CTA.height})`;
const ctaPx = (value: number) => `calc(${CTA_H} * ${value / CTA.height})`;

/** Keeps each line's engine as wide as its words, so the dot sits flush. */
const LINE_FLOW = "shrink-0 grow-0 basis-auto";

/**
 * The block's left rail: the masthead, the report, and the way into the story.
 *
 * Same construction as the other two blocks' headings — one `<h2>`, one
 * `TextEngine` per authored line so the break holds at every width, and the
 * full stop set apart so it can carry the accent against near-black type. The
 * copy is a word reveal at a tighter word gap than the engine's default; see
 * `season-heading.tsx` for why that gap is set by hand.
 */
export const PaddockIntro = ({ headline, intro, cta }: PaddockIntroProps) => (
  <>
    <h2
      className="absolute z-20 flex flex-col font-display font-bold uppercase leading-headline text-foreground"
      style={{
        left: `var(--head-left, ${px(GUTTER)})`,
        top: `var(--head-top, ${px(GUTTER)})`,
        // The block's own 96, with the floor the other three mastheads take
        // below `lg` — at 390 a share of the width puts it at 26.
        fontSize: `max(${type(96)}, var(--head-min, 0px))`,
      }}
    >
      {headline.map((line, index) => {
        const last = index === headline.length - 1;
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
              className={`justify-start text-left ${LINE_FLOW}`}
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
                className="text-accent"
              >
                .
              </Spring>
            ) : null}
          </span>
        );
      })}
    </h2>

    <div
      // From `xl` it is anchored to the band, not to the top: what the design
      // fixes is the 32 between this column's foot and the dark strip. Below
      // that it is simply the next thing in the column.
      className="absolute z-20 flex flex-col items-start"
      style={{
        left: `var(--intro-left, ${px(INTRO.x)})`,
        // The band's own height **times the strip's scale**: below `lg` the
        // strip is scaled up about its bottom edge and the dark band grows
        // with it, so a column anchored to the frame's unscaled 169 ended up
        // standing inside the strip — the call to action came down on top of
        // "round 11".
        bottom: `var(--intro-bottom, calc(${px(BAND.height)} * var(--band-scale, 1) + ${px(
          INTRO.fromBand,
        )}))`,
        // The frame's 338 is 180 real pixels at 768, and the copy inside it
        // has been lifted from 9.6 to 17 — six short lines in a column built
        // for four. The floor is what the block has before the figure's own
        // silhouette starts, and it is inert from `lg` up.
        width: `max(${px(INTRO.width)}, var(--intro-min-w, 0px))`,
        gap: `var(--intro-gap, ${px(INTRO.gap)})`,
      }}
    >
      <TextEngine
        tag="p"
        mode="forward"
        enabled
        delayIn={headline.length * LINE_STAGGER + 90}
        wordStagger={30}
        // The engine spaces words with its own gap rather than the face's;
        // 0.22 is the value the season block settled on.
        columnGap={0.22}
        wordOut={WORD_OUT}
        wordIn={WORD_IN}
        wordConfig={COPY_CONFIG}
        // **Light on a phone.** The figure fills the block there and the
        // report lands on its collar and the strip below it — both near
        // black. The same thing the timeline does with the copy that sits on
        // its photographs.
        className="w-full flex-wrap justify-start uppercase leading-display text-foreground max-sm:text-foreground-on-dark"
        // The block's own description, on the same floor the season's and the
        // timeline's carry, so the three read at one size.
        style={{ fontSize: `max(${type(18)}, var(--copy-min-size, 0px))` }}
      >
        {intro}
      </TextEngine>

      <Spring
        tag="div"
        mode="forward"
        enabled
        config={REVEAL_CONFIG}
        delayIn={headline.length * LINE_STAGGER + 260}
        from={RISE_FROM}
        to={RISE_TO}
      >
        <Link
          href={cta.href}
          className="group/cta relative block"
          // Every length in the button is a ratio of its own height, so one
          // variable resizes the whole control — chamfer, padding, label and
          // arrow together — and the frame's own 50 is the default.
          style={{ width: CTA_W, height: CTA_H }}
        >
          {/* The outline is a stroked path, not a border: the corner is
              chamfered, and a border cannot follow a chamfer. Same shape
              family as the timeline's plates.
              On hover the accent floods the shape and the label reverses out
              of it — `clip-path` from the left rather than a background, so
              the fill respects the chamfer instead of squaring it off. */}
          <svg
            viewBox={`0 0 ${CTA.width} ${CTA.height}`}
            className="absolute inset-0 size-full"
            aria-hidden
          >
            {/* Filled, not hollow. Sampled off the Figma node: the interior
                is `#090a0b` and only the 1px ring is accent — on this light
                surface the button is a dark slab with cyan type, not an
                outline. */}
            <path
              d={CTA_PATH}
              fill="var(--surface-black)"
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
            className="absolute inset-y-0 flex items-center whitespace-nowrap uppercase leading-flat text-accent transition-colors duration-[var(--duration-normal)] ease-plate group-hover/cta:text-surface-black"
            style={{
              left: ctaPx(CTA.padX),
              gap: ctaPx(CTA.gap),
              fontSize: ctaPx(20),
            }}
          >
            {cta.label}
            {/* The arrow steps forward on hover — the one bit of state this
                block has, so a transition rather than a spring. */}
            <svg
              viewBox="0 0 13.71 10.71"
              aria-hidden
              className="block transition-transform duration-[var(--duration-fast)] ease-entrance group-hover/cta:translate-x-1"
              // The stroke follows the label out of the flood.
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
    </div>
  </>
);
