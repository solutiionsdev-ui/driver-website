"use client";

// 📖 Docs: obsidian/frontend/components/sections.md

import { useCallback, useEffect, useRef } from "react";

import { useSpringTrigger } from "@/hooks/animation/use-spring-trigger";

export interface SeasonDissolveProps {
  /**
   * Which surface the seam carries across. `light` brings the hero's page
   * colour down into a dark block; `dark` brings a dark block's colour down
   * into a light one. The chequers and their accent are the same either way —
   * only what they are cut from changes.
   */
  carry?: "light" | "dark";
  /**
   * Paint order inside the block it seams. The flag is opaque where it
   * survives, so it has to sit **over** the block's own content — and how high
   * that is differs: the season block's copy is on `z-auto`, the timeline's
   * rows are on `z-20`.
   */
  z?: number;
  className?: string;
}

/**
 * Square edge, in CSS px. Big enough to read as a flag, small enough to melt.
 *
 * Read from `--flag-cell` at draw time rather than baked in, so a width can
 * ask for a finer weave — the same 24 that is crumbs against a 55 masthead is
 * a mouthful against the 40 the phone sets.
 */
const CELL = 24;
/** Fraction of the band that stays solid before the checker starts. */
const SOLID_UNTIL = 0.16;
/** How far the pattern travels off the top over the scroll window. Above 1 so
 *  the flag has cleared well before the block finishes seating, rather than
 *  hanging over the headline for the whole of the scroll. */
const LIFT = 2;
/** Share of squares that come through in the accent instead. */
const ACCENT_SHARE = 0.06;

const TRIGGER_CONFIG = { tension: 140, friction: 30 };

/**
 * Deterministic per-cell noise. A dissolve wants an *irregular* edge; a hash of
 * the cell's coordinates gives one that is stable across resizes and reloads,
 * where `Math.random()` would boil.
 */
const noise = (x: number, y: number): number => {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/**
 * The seam between the hero and the season block, as a chequered flag coming
 * apart.
 *
 * The hero's light surface carries into the top of the dark block, breaks into
 * a chequerboard, and the chequers thin out into the black — so the two blocks
 * are joined by the one image the whole page is about rather than by a
 * gradient. Scrolling drives it: the pattern rides up and burns off, and by the
 * time the block is seated the seam is gone and the map is clean.
 *
 * It is a canvas because the dissolve needs irregularity. A CSS
 * `repeating-conic-gradient` can draw the chequers but every square would
 * vanish in lockstep with its row, which reads as a wipe, not a dissolve.
 */
export const SeasonDissolve = ({
  carry = "light",
  z = 10,
  className,
}: SeasonDissolveProps) => {
  const bandRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const paletteRef = useRef({
    light: "#f7fafb",
    dark: "#090a0b",
    accent: "#02d2e3",
  });
  const carryRef = useRef(carry);
  useEffect(() => {
    carryRef.current = carry;
  }, [carry]);
  const progressRef = useRef(0);

  const render = useCallback(() => {
    const context = contextRef.current;
    const canvas = canvasRef.current;
    const band = bandRef.current;
    if (!context || !canvas || !band) return;

    const width = band.clientWidth;
    const height = band.clientHeight;
    if (!width || !height) return;

    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas.width !== width * ratio || canvas.height !== height * ratio) {
      canvas.width = width * ratio;
      canvas.height = height * ratio;
    }
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);

    const { accent } = paletteRef.current;
    const surface = paletteRef.current[carryRef.current];
    const cell =
      Number.parseFloat(
        getComputedStyle(band).getPropertyValue("--flag-cell"),
      ) || CELL;
    const columns = Math.ceil(width / cell);
    const rows = Math.ceil(height / cell);
    const lift = progressRef.current * LIFT;

    for (let y = 0; y < rows; y += 1) {
      const depth = y / Math.max(1, rows - 1) + lift;
      if (depth > 1) break;

      const solid = depth <= SOLID_UNTIL;
      const fade = clamp01(1 - (depth - SOLID_UNTIL) / (1 - SOLID_UNTIL));
      if (!solid && fade <= 0) break;

      for (let x = 0; x < columns; x += 1) {
        if (!solid) {
          // Only one colour of the chequerboard survives the break-up.
          if ((x + y) % 2 !== 0) continue;
          if (noise(x, y) > fade) continue;
        }
        context.fillStyle =
          !solid && noise(x + 101, y + 57) < ACCENT_SHARE ? accent : surface;
        context.fillRect(x * cell, y * cell, cell, cell);
      }
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return;
    contextRef.current = context;

    const styles = getComputedStyle(document.documentElement);
    paletteRef.current = {
      light: styles.getPropertyValue("--background").trim() || "#f7fafb",
      dark: styles.getPropertyValue("--surface-black").trim() || "#090a0b",
      accent: styles.getPropertyValue("--accent").trim() || "#02d2e3",
    };

    render();
  }, [render]);

  useEffect(() => {
    const band = bandRef.current;
    if (!band) return;

    const observer = new ResizeObserver(render);
    observer.observe(band);
    window.addEventListener("resize", render);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", render);
    };
  }, [render]);

  useSpringTrigger({
    elementRef: bandRef,
    // The window is the band's own passage up the screen: solid flag when its
    // top reaches the fold, gone by the time that top reaches the ceiling.
    start: "top bottom",
    end: "top top",
    mode: "scrub",
    config: TRIGGER_CONFIG,
    onChange: ({ progress }) => {
      if (progress === progressRef.current) return;
      progressRef.current = progress;
      render();
    },
  });

  return (
    <div
      ref={bandRef}
      aria-hidden
      // Above the copy, not behind it: the flag is opaque where it survives,
      // so letting the headline show through it would put cyan on white. This
      // way the block's copy is *unveiled* by the flag coming apart.
      //
      // **The order arrives as a class, not as an inline `z-index`**, so a
      // width can put the flag behind the copy instead — which the phone
      // does: the cells are 24 square against a masthead that is 40 tall
      // there, so the dissolve read as blocks chewing the letters rather than
      // as a flag coming apart over them.
      className={`pointer-events-none absolute inset-x-0 top-0 h-[34svh] z-[var(--flag-z)] ${className ?? ""}`}
      style={{ "--flag-z": z } as React.CSSProperties}
    >
      <canvas ref={canvasRef} className="block size-full" />
    </div>
  );
};
