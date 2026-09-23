"use client";

// 📖 Docs: obsidian/frontend/components/sections.md

import type { CSSProperties } from "react";

import TextEngine from "spring-text-engine";

import { Spring } from "@/components/animation/springs/spring";
import type { HomeContent } from "@/data/mocks/home";

export interface TimelineHeadingProps {
  headline: HomeContent["timeline"]["headline"];
  className?: string;
  style?: CSSProperties;
}

const REVEAL_CONFIG = { tension: 90, friction: 26 };
const LINE_STAGGER = 130;

// Module constants, not JSX literals: a fresh object per render re-seeds the
// animation mid-flight.
const WORD_OUT = { opacity: 0, y: "0.35em" };
const WORD_IN = { opacity: 1, y: "0em" };
const FADE_FROM = { opacity: 0 };
const FADE_TO = { opacity: 1 };

/** Keeps each line's engine as wide as its words, so the dot sits flush. */
const LINE_FLOW = "shrink-0 grow-0 basis-auto";

/**
 * "FROM KARTS TO F1." — the block's masthead, hard against the right gutter.
 *
 * Same construction as the season headline: one `<h2>`, one `TextEngine` per
 * authored line so the break holds at every width, and the full stop set apart
 * so it can carry white against the cyan. The engine's container is a flex row,
 * so `justify-end` is what actually right-aligns it.
 */
export const TimelineHeading = ({
  headline,
  className,
  style,
}: TimelineHeadingProps) => (
  <h2
    style={style}
    // The alignment is not baked in: from `xl` the frame sets the masthead
    // hard against its own gutter, and below that the block centres it. Both
    // the column and the engine's own row have to turn together, so the two
    // ride the same pair of classes rather than one fighting the other.
    // One line below `xl`, two from it. The frame breaks the masthead by hand
    // so it stacks against the right gutter; centred over a photograph the
    // same break reads as a stack with nothing holding it, and the block is
    // wide enough for the line whole.
    // One line on a phone: the two authored lines sit in a row there, which
    // at the block's narrow size still fits the screen and reads as the title
    // it is rather than as two stacked fragments.
    className={`flex flex-col items-center text-center max-sm:flex-row max-sm:flex-wrap max-sm:justify-start max-sm:text-left max-sm:gap-x-[0.28em] lg:items-end lg:text-right font-display font-bold uppercase leading-headline text-accent ${className ?? ""}`}
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
            className={`justify-center max-sm:justify-start lg:justify-end ${LINE_FLOW}`}
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
);
