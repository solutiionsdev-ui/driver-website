"use client";

// 📖 Docs: obsidian/frontend/components/sections.md

import TextEngine from "spring-text-engine";

import { Spring } from "@/components/animation/springs/spring";
import type { HomeContent } from "@/data/mocks/home";

import { INTRO, RULE, masthead, px, type } from "./geometry";

export interface SeasonHeadingProps {
  headline: HomeContent["season"]["headline"];
  intro: HomeContent["season"]["intro"];
  className?: string;
}

const REVEAL_CONFIG = { tension: 90, friction: 26 };
/** Small copy wants a quicker settle than the display line. */
const COPY_CONFIG = { tension: 150, friction: 24 };
const LINE_STAGGER = 130;

// Module constants, not JSX literals: both engines hand these to `useSpring`,
// and a fresh object per render re-seeds the animation mid-flight.
const WORD_OUT = { opacity: 0, y: "0.35em" };
const WORD_IN = { opacity: 1, y: "0em" };
const FADE_FROM = { opacity: 0 };
const FADE_TO = { opacity: 1 };
const RULE_FROM = { opacity: 0, transform: "scaleX(0)" };
const RULE_TO = { opacity: 1, transform: "scaleX(1)" };

/** Keeps each line's engine as wide as its words, so the dot sits flush. */
const HEADLINE_FLOW = "shrink-0 grow-0 basis-auto";

/**
 * The block's left rail. The headline arrives word by word as the section
 * scrolls up — `mode="forward"`, so it plays on the way down and stays put on
 * the way back — then the cyan rule draws and the intro fades in behind it.
 *
 * Each headline line is its own `TextEngine`: the design breaks the line by
 * hand, and one engine per line keeps that break exact at every width instead
 * of leaving it to a `max-w` guess. Neither engine sets `overflow`, because the
 * design's 0.93 leading would clip descenders under a mask.
 */
export const SeasonHeading = ({
  headline,
  intro,
  className,
}: SeasonHeadingProps) => (
  <div className={`flex flex-col ${className ?? ""}`}>
    {/* One heading, not one per line. The break is authored rather than left
        to a `max-w`, because "THE SEASON" measures wider than the design's
        271px box and a width cap would wrap it after "THE". */}
    <h2
      className="flex flex-col font-display font-bold uppercase leading-headline text-accent"
      style={{ fontSize: masthead(55) }}
    >
      {headline.map((line, index) => {
        const last = index === headline.length - 1;
        return (
          // The full stop is set apart from the line so it can carry its own
          // colour — the design puts it in white against the cyan headline.
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
              // The engine's container is a flex row — `justify-start` is what
              // actually left-aligns it; `text-left` alone would not.
              className={`justify-start text-left ${HEADLINE_FLOW}`}
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

    <Spring
      tag="div"
      mode="forward"
      enabled
      config={REVEAL_CONFIG}
      delayIn={headline.length * LINE_STAGGER}
      from={RULE_FROM}
      to={RULE_TO}
      className="origin-left bg-accent"
      style={{
        // The frame's 28 is 7.6 real pixels on a phone — the rule sat on the
        // masthead's foot. A floor gives the mark, and the report under it,
        // room to read as their own group.
        marginTop: `max(${px(RULE.top)}, var(--head-air, 0px))`,
        width: px(RULE.width),
        height: px(RULE.height),
      }}
    />

    {/* Word by word, like the headline above it — a block fade read as a
        different kind of arrival next to type that assembles. */}
    <TextEngine
      tag="p"
      mode="forward"
      enabled
      delayIn={headline.length * LINE_STAGGER + 90}
      wordStagger={34}
      // The engine lays words out as flex items and spaces them with its own
      // gap; the default 0.3em is wider than the space this face sets and
      // pushed the copy onto a fourth line. 0.22 puts the frame's three lines
      // back with a step of headroom against font-metric drift.
      columnGap={0.22}
      wordOut={WORD_OUT}
      wordIn={WORD_IN}
      wordConfig={COPY_CONFIG}
      className="flex-wrap justify-start uppercase leading-display text-foreground-on-dark"
      style={{
        marginTop: `max(${px(INTRO.top)}, var(--head-air, 0px))`,
        width: `max(${px(INTRO.width)}, var(--copy-min-w, 0px))`,
        // The same floor the timeline's description carries, so the two runs
        // of prose on the page read at one size.
        fontSize: `max(${px(18)}, var(--copy-min-size, 0px))`,
      }}
    >
      {intro}
    </TextEngine>
  </div>
);
