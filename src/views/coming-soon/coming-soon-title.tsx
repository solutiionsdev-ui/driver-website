"use client";

import TextEngine from "spring-text-engine";

import { Spring } from "@/components/animation/springs/spring";

export interface ComingSoonTitleProps {
  eyebrow: string;
  title: string;
}

const REVEAL_CONFIG = { tension: 90, friction: 26 };

// Module constants: `Spring` and `TextEngine` hand these straight to
// `useSpring`, so a fresh object per render would re-seed the reveal.
const FADE_FROM = { opacity: 0 };
const FADE_TO = { opacity: 1 };
const WORD_OUT = { opacity: 0, y: "0.35em" };
const WORD_IN = { opacity: 1, y: "0em" };

/**
 * The eyebrow and the headline, revealed the way the hero's name is: word by
 * word through `TextEngine`, without `overflow`, so the display leading can
 * stay tight without shaving glyphs.
 */
export const ComingSoonTitle = ({ eyebrow, title }: ComingSoonTitleProps) => (
  <div className="flex flex-col gap-4">
    <Spring
      tag="p"
      enabled
      from={FADE_FROM}
      to={FADE_TO}
      config={REVEAL_CONFIG}
      className="text-label uppercase leading-flat text-foreground-muted"
    >
      {eyebrow}
    </Spring>
    <TextEngine
      tag="h1"
      mode="once"
      enabled
      delayIn={120}
      wordStagger={110}
      wordOut={WORD_OUT}
      wordIn={WORD_IN}
      wordConfig={REVEAL_CONFIG}
      className="justify-start text-left font-display font-bold uppercase leading-headline text-display-lg text-foreground md:text-impact"
    >
      {title}
    </TextEngine>
  </div>
);
