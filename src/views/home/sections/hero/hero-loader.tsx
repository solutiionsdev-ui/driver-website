"use client";

import { useEffect, useRef, useState } from "react";

import { Spring } from "@/components/animation/springs/spring";
import type { HomeContent } from "@/data/mocks/home";

/**
 * The exit runs in three beats rather than one cross-fade:
 *
 *   ready → the loader's own content clears → a beat of empty ground →
 *   the veil lifts and the page's entrance begins
 *
 * The beat is the point. Fading the helmet out *through* the arriving hero
 * puts two unrelated animations on screen at once and reads as a glitch;
 * emptying the ground first makes the lift feel like a deliberate hand-off.
 */
const CLEAR_MS = 430;
const PAUSE_MS = 240;

/**
 * Hard stop on the lift, in case the spring never reports a low enough
 * opacity (a backgrounded tab pauses rAF, so the poll below can stall).
 * Not the normal exit path — see `useEffect` on `lifting`.
 */
const LIFT_TIMEOUT_MS = 3000;

/** The helmet silhouette, derived from helmet.png by scripts/recolor-helmet.mjs. */
const HELMET_MASK = "/assets/hero/ui/helmet-mask.png";
const MASK_STYLE = {
  maskImage: `url(${HELMET_MASK})`,
  WebkitMaskImage: `url(${HELMET_MASK})`,
  maskSize: "contain",
  WebkitMaskSize: "contain",
  maskRepeat: "no-repeat",
  WebkitMaskRepeat: "no-repeat",
  maskPosition: "center",
  WebkitMaskPosition: "center",
} as const;

/**
 * Creeps to 70% on its own and only completes when the scene lands.
 *
 * There is no real progress figure to report — the scene resolves a handful of
 * assets and then compiles — and a bar sitting at 100% while it still works
 * would be a lie. Both the helmet fill and the bar read from this one value so
 * they can never disagree.
 */
const progressFor = (ready: boolean) => (ready ? 1 : 0.7);
/**
 * Soft while waiting so it drifts; stiff once there is something to report.
 * The waiting tension is tuned so the meter is roughly a third across by the
 * time a warm load resolves — much softer and it completes from almost
 * nothing, which reads as a jump rather than a finish.
 */
const progressConfig = (ready: boolean) =>
  ready ? { tension: 170, friction: 26 } : { tension: 10, friction: 30 };

export interface HeroLoaderProps {
  brand: HomeContent["hero"]["brand"];
  driver: HomeContent["hero"]["driver"];
  /** True once the scene has loaded, uploaded and compiled everything. */
  ready: boolean;
  /** Fired when the content below should begin its staggered reveal. */
  onHandover: () => void;
}

/**
 * Full-bleed loading veil.
 *
 * It covers the page until the scene reports `ready` — which the scene only
 * does after every texture is uploaded and every program compiled — so the
 * first thing anyone sees is a finished frame rather than a canvas popping in
 * mid-prewarm.
 *
 * On the page's own ground, so the lift is a fade between identical colours
 * and never a flash. Nothing here may be a CSS keyframe, so every moving part
 * is a spring easing toward a target.
 */
export const HeroLoader = ({
  brand,
  driver,
  ready,
  onHandover,
}: HeroLoaderProps) => {
  const [mounted, setMounted] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [lifting, setLifting] = useState(false);
  const veilRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!ready) return;
    setClearing(true);
    const lift = setTimeout(() => {
      setLifting(true);
      onHandover();
    }, CLEAR_MS + PAUSE_MS);
    return () => clearTimeout(lift);
  }, [ready, onHandover]);

  /**
   * Unmount when the veil has actually faded, not on a timer.
   *
   * This was a timer, and it was the cause of the reported flicker at the end
   * of the load: a spring approaches zero asymptotically and has no fixed
   * duration, so a fixed delay fired while the veil was still faintly visible
   * and the element was removed mid-fade — a step from a few percent opacity
   * straight to nothing. Polling the rendered value instead means the exit is
   * correct whatever the spring config is later re-tuned to.
   */
  useEffect(() => {
    if (!lifting) return;
    let frame = 0;
    const bail = setTimeout(() => {
      cancelAnimationFrame(frame);
      setMounted(false);
    }, LIFT_TIMEOUT_MS);

    const check = () => {
      const el = veilRef.current;
      // 0.004 is below an 8-bit channel's smallest step, so removing the
      // element here cannot change a pixel.
      if (!el || Number(getComputedStyle(el).opacity) <= 0.004) {
        setMounted(false);
        return;
      }
      frame = requestAnimationFrame(check);
    };
    frame = requestAnimationFrame(check);

    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(bail);
    };
  }, [lifting]);

  if (!mounted) return null;

  const progress = progressFor(ready);
  const config = progressConfig(ready);

  return (
    <Spring
      ref={veilRef}
      tag="div"
      role="status"
      aria-label={ready ? "Loaded" : `Loading ${brand.name}`}
      enabled={lifting}
      from={{ opacity: 1 }}
      to={{ opacity: 0 }}
      config={{ tension: 70, friction: 24 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background"
      style={{ pointerEvents: ready ? "none" : "auto" }}
    >
      <Spring
        tag="div"
        enabled={clearing}
        from={{ opacity: 1, transform: "translateY(0rem)" }}
        to={{ opacity: 0, transform: "translateY(-0.75rem)" }}
        config={{ tension: 140, friction: 26 }}
        className="flex flex-col items-center"
      >
        {/* The helmet, filling top to bottom. Two stacked layers inside one
            mask: a faint shell that is always there, and a solid sheet whose
            height is the progress. Masking the *container* means the fill is
            a plain rectangle and can be a spring like everything else. */}
        <div
          // Sized to the trimmed mask's own 434:512 aspect, so `contain` has
          // no slack to letterbox into and the helmet fills the box.
          className="relative h-[8.5rem] w-[7.2rem]"
          style={MASK_STYLE}
          aria-hidden
        >
          <div className="absolute inset-0 bg-foreground/12" />
          <Spring
            tag="div"
            enabled
            from={{ transform: "scaleY(0)" }}
            to={{ transform: `scaleY(${progress})` }}
            config={config}
            className="absolute inset-0 origin-top bg-foreground"
          />
        </div>

        <Spring
          tag="p"
          enabled
          // Arrives just after the helmet starts filling, so the two read as
          // one gesture rather than appearing together.
          delayIn={260}
          from={{ opacity: 0, transform: "translateY(0.6rem)" }}
          to={{ opacity: 1, transform: "translateY(0rem)" }}
          config={{ tension: 110, friction: 26 }}
          className="mt-7 text-lead uppercase leading-flat tracking-[0.18em] text-foreground"
        >
          {driver.firstName} {driver.lastName}
        </Spring>
      </Spring>

      {/* Full-width 4px meter pinned to the bottom edge. */}
      <Spring
        tag="div"
        enabled={clearing}
        from={{ opacity: 1 }}
        to={{ opacity: 0 }}
        config={{ tension: 140, friction: 26 }}
        className="absolute inset-x-0 bottom-0 h-1 overflow-hidden bg-border-muted"
      >
        <Spring
          tag="div"
          enabled
          from={{ transform: "scaleX(0)" }}
          to={{ transform: `scaleX(${progress})` }}
          config={config}
          className="h-full w-full origin-left bg-foreground"
        />
      </Spring>
    </Spring>
  );
};
