"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";

import { Spring } from "@/components/animation/springs/spring";
import type { HomeContent } from "@/data/mocks/home";

import { DriverIdentity } from "./driver-identity";
import { DriverPanels } from "./driver-panels";
import { HeroActions } from "./hero-actions";
import { HeroLoader } from "./hero-loader";
import { HeroNav } from "./hero-nav";

/**
 * The scene is a code-split client leaf — `three` lives in its own chunk
 * and is never fetched on the bot path (optimize-3d-scene §1). The poster
 * below renders on the bot path only, so crawlers screenshot a real image.
 */
const HeroSceneCanvas = dynamic(
  () => import("../hero-scene").then((m) => m.HeroSceneCanvas),
  { ssr: false },
);

/**
 * Entrance choreography, in ms from the loader handing over. The last block
 * starts at 1500 and its spring settles in roughly 1.4s, so the sequence runs
 * a little under the 3s the whole reveal is budgeted.
 */
const REVEAL_DELAY = {
  nav: 0,
  identity: 180,
  panels: 900,
  actions: 1500,
} as const;

/** Slow enough to read as arrival rather than a snap. */
const REVEAL_CONFIG = { tension: 90, friction: 26 };
const REVEAL_FROM = { opacity: 0, transform: "translateY(1.25rem)" };
const REVEAL_TO = { opacity: 1, transform: "translateY(0rem)" };

export interface HeroProps {
  content: HomeContent["hero"];
  /** False on the bot path — the three.js chunk is never loaded. */
  showScene: boolean;
}

/**
 * The GRIDO1 hero (Figma 823:247). The depth-parallax portrait with the
 * liquid helmet reveal sits at the centre; the UI is a masthead, two side
 * rails and a footer row laid over it.
 *
 * The scene layer switches position with the breakpoint rather than being
 * rendered twice: from `xl` it is a full-bleed backdrop behind the rails, and
 * below `xl` — where rails and portrait cannot share the width — it drops
 * into the flow as a band between the name and the panels.
 *
 * Entrance: the loader holds the page until the scene reports ready, then
 * hands over and the rails stagger in around it. The content stays mounted
 * underneath the whole time rather than being conditionally rendered — it is
 * the page's actual markup, and crawlers and assistive tech should not have
 * to wait on a WebGL prewarm to see it.
 */
export const Hero = ({ content, showScene }: HeroProps) => {
  const { driver } = content;
  // The bot path has no scene to wait for, so it is ready by definition.
  const [sceneReady, setSceneReady] = useState(!showScene);
  const [revealed, setRevealed] = useState(false);

  const handleReady = useCallback(() => setSceneReady(true), []);
  const handleHandover = useCallback(() => setRevealed(true), []);

  // The canvas covers the whole section so the backdrop's contours run
  // unbroken across it; this box is what keeps the portrait its own size while
  // that happens. It is a real element in the flow, so the layout — not a magic
  // number — decides how big Kimi is. Hidden from `xl`, where the box and the
  // canvas are the same thing and the scene needs no correction.
  //
  // Refs, not state: the scene reads them on its own resize pass. Measuring
  // into state re-rendered this component continuously, and every `Spring`
  // under it re-seeds when its parent renders — the meta rows and `driver_012`
  // sat frozen at part opacity.
  const sectionRef = useRef<HTMLElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  return (
    <section
      // Marks the hero for the 1441-1920 type base — see `globals.css`.
      data-hero
      ref={sectionRef}
      className="relative isolate min-h-lvh overflow-hidden bg-background"
    >
      {/* Bot path only — a still of what the scene's backdrop plane draws. */}
      {!showScene && (
        /* eslint-disable-next-line @next/next/no-img-element -- decorative vector backdrop; the optimiser rejects SVG */
        <img
          src="/assets/hero/ui/backdrop-lines.svg"
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 size-full object-cover"
        />
      )}

      {/* Full-bleed at every width: the contours have to be continuous and
          moving across the whole block, and the plane is rescaled to the
          frustum each frame, so it can only reach as far as the canvas does. */}
      {showScene && (
        <div className="pointer-events-none absolute inset-0 z-0">
          <HeroSceneCanvas
            onReady={handleReady}
            revealed={revealed}
            fitTo={{ section: sectionRef, box: boxRef }}
          />
        </div>
      )}

      {/* The ramp the copy is read against below `xl`, where the figure is a
          full-bleed backdrop rather than a block in the column. It has to
          start high enough to reach the masthead and stay transparent long
          enough not to cut the figure in half, which is why the stop sits at
          55% of a tall box rather than near the foot of a short one. `z-10`:
          over the scene, under the copy. Not needed from `xl`, where the
          shoulders stay clear of the row. **Not** behind `showScene`: the bot
          path draws the same portrait as a still, and the copy over it needs
          the same ground. Guarding it was why the ramp was missing from every
          render that fell back to the image.

          It covers the **bottom row only**. The masthead and the meta list sit
          to the left of the figure on clean ground and never needed it; what
          crosses the suit is the trailer cue, the button and the social links,
          and a ramp tall enough to reach the masthead was washing out most of
          the portrait to protect copy that was already legible. */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[22%] xl:hidden"
        // Six stops, not three. A `from/via/to` ramp is linear in alpha
        // between each pair, and the eye reads the corner where two straight
        // segments meet as a hard edge across the suit — which is what the
        // 80%-at-40% version was doing. These stops trace an ease instead:
        // almost nothing for the first third, then most of the rise in the
        // last, so the ramp arrives without ever showing where it began.
        style={{
          backgroundImage: `linear-gradient(to bottom,
            color-mix(in srgb, var(--background) 0%, transparent) 0%,
            color-mix(in srgb, var(--background) 6%, transparent) 26%,
            color-mix(in srgb, var(--background) 20%, transparent) 46%,
            color-mix(in srgb, var(--background) 45%, transparent) 64%,
            color-mix(in srgb, var(--background) 74%, transparent) 80%,
            color-mix(in srgb, var(--background) 93%, transparent) 91%,
            var(--background) 100%)`,
        }}
      />

      <HeroLoader
        brand={content.brand}
        driver={driver}
        ready={sceneReady}
        onHandover={handleHandover}
      />

      {/* The foot clears the frame by exactly what the masthead does. */}
      <div className="flex min-h-lvh flex-col px-6 pb-6 pt-6 short:py-3 sm:px-8">
        <Spring
          tag="div"
          enabled={revealed}
          from={REVEAL_FROM}
          to={REVEAL_TO}
          config={REVEAL_CONFIG}
          delayIn={REVEAL_DELAY.nav}
          /* Above the identity block: the burger panel drops out of the
             masthead and would otherwise be painted over by the headline,
             which is a sibling in the same stacking context. */
          className="relative z-30"
        >
          <HeroNav
            brand={content.brand}
            nav={content.nav}
            garage={content.garage}
          />
        </Spring>

        <div className="flex flex-auto flex-col gap-8 py-10 short:gap-4 short:py-4 md:gap-6 md:pb-4 md:pt-6 max-lg:justify-start max-lg:gap-4 max-lg:pt-2 max-sm:gap-2 max-sm:pt-1 xl:flex-1 xl:flex-row xl:items-center xl:justify-between xl:gap-0 xl:py-0">
          {/* From `md` the rails sit opposite the driver block rather than
              beside the portrait. They used to be centred on the band, which
              put them over the shoulder — dark copy on a dark suit — while the
              ground next to the text was clean and empty. The portrait keeps
              the full width beneath. `contents` at either end leaves the phone
              stack and the frame's own three-part row untouched. */}
          <div className="contents md:flex md:items-start md:justify-between md:gap-8 xl:contents">
            <DriverIdentity
              driver={driver}
              revealed={revealed}
              delay={REVEAL_DELAY.identity}
              className="relative z-20 order-2 xl:order-none"
            />

            {/* **Both rails are gone on the phone.** At 390 the column runs
                the width of the screen and the figure takes the bottom two
                thirds of it: whatever stood here ended up on the subject's
                face, dark type on skin, and shrinking him to clear it left
                the block's own subject small. Neither rail is unique to this
                screen — the next race is the calendar strip's live round and
                the season figures are the paddock's own panel — so on a phone
                the block is the name, the meta rows and Kimi. They return at
                `sm`. */}
            <div className="order-3 max-sm:hidden md:shrink-0 xl:order-none">
              <Spring
                tag="div"
                enabled={revealed}
                from={REVEAL_FROM}
                to={REVEAL_TO}
                config={REVEAL_CONFIG}
                delayIn={REVEAL_DELAY.panels}
                className="relative z-20"
              >
                <DriverPanels
                  nextRace={content.nextRace}
                  season={content.season}
                />
              </Spring>
            </div>
          </div>

          {/* The portrait's box. It holds the space in the column and, through
              `subjectBox`, tells the scene how big to draw Kimi — the canvas
              itself is elsewhere, spanning the whole section. Gone from `xl`,
              where the box and the canvas coincide. */}
          {/* **Out of the column entirely below `xl`.** Two goes at putting the
              figure *in* the flow both failed the same way: given a fixed
              height it pushed the copy under the fold, and given the space
              that was left it came out too small to be the subject. It is a
              backdrop, so it is laid out as one — pinned to the section, drawn
              at the full height the scene wants, with the copy over it. What
              makes that readable is the ramp below, not clearance. */}
          {/* Below `lg` the figure takes the **bottom half** and nothing else.
              Measured at 768x1024: the masthead runs x 32-486 and a figure
              centred on the block runs -64 to 928, so the name sits on the
              helmet whatever its size — a centred figure on a 768 screen
              cannot clear a name that is 59% of the width. Separating them
              vertically is the only arrangement that does. */}
          <div className="pointer-events-none absolute inset-0 z-0 order-1 -mx-6 max-lg:inset-y-auto max-lg:bottom-0 max-lg:h-[70%] max-sm:h-[64%] md:order-first xl:order-none xl:hidden">
            {/* The scene leaves headroom above the subject, which read as dead
                space under the meta rows. Overhanging the box and anchoring to
                its foot crops that headroom off — but only from `md`: on a
                phone the box is short enough that 7rem of overhang puts the
                portrait on top of the meta rows. */}
            <div
              ref={boxRef}
              // The box is what the scene sizes the subject to. Shorter below
              // `lg`, where the block is portrait and a full-height figure
              // takes the whole screen.
              // The **scene** is what this has to be sized for, not the
              // still: the two draw different subjects — the still is the
              // photograph of Kimi's face, the scene puts his helmet on, and
              // the helmet fills far more of the same box. Measured on the
              // phone, the still's crown sits 23% down the box and the
              // helmet's 10%, so a box that clears the meta rows for one
              // does not for the other. The number here is the helmet's.
              className="absolute inset-x-0 bottom-0 h-[calc(100%-4rem)] md:h-[calc(100%-2rem)] max-lg:h-full"
            >
              {!showScene && (
                <Image
                  src={driver.portrait}
                  alt={`Portrait of ${driver.firstName} ${driver.lastName} — ${driver.tagline}`}
                  width={828}
                  height={714}
                  priority
                  // The same step right the scene takes below 1280 — see
                  // `NARROW_STEP` in `scene.ts`. Without it the two paths
                  // disagree: the live subject clears the masthead and the
                  // still does not.
                  className="pointer-events-none absolute bottom-0 left-1/2 h-full w-auto max-w-none -translate-x-1/2 object-contain object-bottom max-lg:translate-x-[-50%]"
                />
              )}
            </div>
            {/* Phones stack the rails *under* the portrait rather than beside
                it, and the canvas no longer clips at the box, so the suit ran
                on behind them. This lands it first. */}
            <div className="pointer-events-none absolute inset-x-0 -bottom-52 h-[26rem] bg-linear-to-b from-transparent via-background via-60% to-background md:hidden" />
          </div>
        </div>

        <Spring
          tag="div"
          enabled={revealed}
          from={REVEAL_FROM}
          to={REVEAL_TO}
          config={REVEAL_CONFIG}
          delayIn={REVEAL_DELAY.actions}
          className="relative z-20 xl:mt-0"
        >
          <HeroActions
            trailer={content.trailer}
            profile={content.profile}
            socials={content.socials}
          />
        </Spring>
      </div>
    </section>
  );
};
