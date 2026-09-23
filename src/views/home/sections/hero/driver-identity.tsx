"use client";

import Image from "next/image";
import TextEngine from "spring-text-engine";

import { Spring } from "@/components/animation/springs/spring";
import type { HomeContent } from "@/data/mocks/home";

export interface DriverIdentityProps {
  driver: HomeContent["hero"]["driver"];
  /** True once the loader has handed over and the entrance may play. */
  revealed: boolean;
  /** Offset of this block within the page's entrance, in ms. */
  delay: number;
  className?: string;
}

const ROW_STAGGER = 130;
const REVEAL_CONFIG = { tension: 90, friction: 26 };

// Module constants, not literals in the JSX: `Spring` and `TextEngine` hand
// these straight to `useSpring`, so a fresh object per render re-seeds the
// animation and it parks partway instead of arriving.
const FADE_FROM = { opacity: 0 };
const FADE_TO = { opacity: 1 };
const ROW_FROM = { opacity: 0, transform: "translateY(0.75rem)" };
const ROW_TO = { opacity: 1, transform: "translateY(0rem)" };
const WORD_OUT = { opacity: 0, y: "0.35em" };
const WORD_IN = { opacity: 1, y: "0em" };

/**
 * The left rail: driver number, the name set in the condensed display face,
 * and the flag / season / team rows. The number is pinned beside the first
 * headline word from `xl` up (Figma 915:203) and falls back to an eyebrow
 * above the headline on narrow screens, where there is no room beside it.
 *
 * The headline reveals word by word through `TextEngine` — it is the one
 * piece of type on the page big enough for the per-word stagger to register,
 * and text animation belongs to the engine rather than a hand-rolled spring.
 * It runs **without** `overflow`: the design sets the leading at 0.95, and
 * clipping at that leading shaves descenders and accented caps. Without the
 * clip the words fade and rise instead of sliding out from behind a mask,
 * which costs nothing here and keeps the design's tight leading intact.
 */
export const DriverIdentity = ({
  driver,
  revealed,
  delay,
  className,
}: DriverIdentityProps) => (
  <div
    className={`flex flex-col gap-10 short:gap-4 md:gap-16 xl:max-w-[26.0625rem] xl:gap-[6.0625rem] ${className ?? ""}`}
  >
    <div className="relative">
      <Spring
        tag="p"
        enabled={revealed}
        from={FADE_FROM}
        to={FADE_TO}
        config={REVEAL_CONFIG}
        delayIn={delay}
        className="mb-4 text-label uppercase leading-flat text-foreground-muted short:mb-1 xl:absolute xl:left-[20.0625rem] xl:top-[0.5625rem] xl:mb-0"
      >
        {driver.id}
      </Spring>

      <TextEngine
        tag="h1"
        mode="once"
        enabled={revealed}
        delayIn={delay}
        wordStagger={110}
        wordOut={WORD_OUT}
        wordIn={WORD_IN}
        wordConfig={REVEAL_CONFIG}
        // `justify-start` does the real work — the container is a flex row, so
        // `text-left` alone would not place the words. `max-w` forces the two
        // names onto separate lines below `xl`, where the rail has no width cap.
        // `md:text-display-lg` between `md` and `xl`, the frame's `text-impact`
        // only from `xl`. Below 1280 the root font size is pinned at 16, so
        // the 96 the frame sets keeps its full size against a viewport that
        // has shrunk — the name ended up wider, relative to the block, than it
        // ever is at 1440, and ran into the figure.
        // Full `text-impact` at `md` and from `xl`; the frame's own 96 is only
        // stepped down over the 1024-1279 band, where the root font size is
        // pinned at 16 and the name was running into the figure. A portrait
        // 768 has the width for it and needs the weight — the masthead is the
        // whole left half of that screen.
        className="max-w-[6em] justify-start text-left font-display font-bold uppercase leading-headline text-display-lg text-foreground short:text-heading md:text-impact lg:text-display-lg xl:text-impact"
      >
        {`${driver.firstName} ${driver.lastName}`}
      </TextEngine>
    </div>

    <ul className="flex flex-col gap-4 short:gap-1">
      {driver.meta.map((row, index) => (
        <Spring
          key={row.label}
          tag="li"
          enabled={revealed}
          from={ROW_FROM}
          to={ROW_TO}
          config={REVEAL_CONFIG}
          delayIn={delay + 260 + index * ROW_STAGGER}
          className="flex items-center gap-2"
        >
          <Image
            src={row.icon}
            alt={row.iconAlt}
            width={row.iconWidth}
            height={row.iconHeight}
            // The optimiser rejects SVG without `dangerouslyAllowSVG`, and
            // vector line art gains nothing from it anyway.
            unoptimized={row.icon.endsWith(".svg")}
            className="shrink-0 object-contain"
            style={{
              width: `${row.iconWidth / 16}rem`,
              height: `${row.iconHeight / 16}rem`,
            }}
          />
          <span className="text-lead uppercase leading-flat text-foreground">
            {row.label}
          </span>
        </Spring>
      ))}
    </ul>
  </div>
);
