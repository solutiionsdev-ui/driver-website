"use client";

// 📖 Docs: obsidian/frontend/components/sections.md

import { useEffect, useRef, type CSSProperties } from "react";
import { animated, easings, useSpring } from "@react-spring/web";

/** One full revolution, in ms. Unhurried — it sits inside a 12px badge. */
const SPIN_MS = 10000;

// Geometry lifted off the supplied `icon-globe.svg`, which drew the same globe
// as one filled path. Its 1-unit bars become 1-unit strokes, so every radius
// here is the asset's outer edge pulled in by half a stroke.
const BOX = { width: 37, height: 23 };
const CX = 18.5;
const CY = 11.5;
const RX = 18;
const RY = 11;
const STROKE = 1;

/**
 * A meridian seen dead-on is a line, and SVG declines to render an ellipse
 * whose `rx` is 0 at all — so it is floored at half a stroke, which is exactly
 * the edge-on sliver it should read as.
 */
const MIN_RX = STROKE / 2;

export interface SeasonGlobeProps {
  className?: string;
  style?: CSSProperties;
}

/**
 * The plate's globe, turning on its polar axis.
 *
 * It was an `<img>` of a static path. Spinning it needs the meridian addressed
 * on its own, which a single filled path cannot do — so the glyph is drawn
 * instead: the limb and the equator are the spin axis seen side on and never
 * move, and only the meridian sweeps, its width running as `cos` of the turn.
 * That is the real projection rather than a squash, so it passes through the
 * limb and goes edge-on at the poles the way a meridian actually does.
 */
export const SeasonGlobe = ({ className, style }: SeasonGlobeProps) => {
  const ref = useRef<SVGSVGElement>(null);

  const [{ turn }, api] = useSpring(() => ({
    from: { turn: 0 },
    to: { turn: Math.PI * 2 },
    loop: true,
    config: { duration: SPIN_MS, easing: easings.linear },
  }));

  // Off screen it costs nothing.
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => (entry.isIntersecting ? api.resume() : api.pause()),
      { threshold: 0 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [api]);

  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${BOX.width} ${BOX.height}`}
      fill="none"
      stroke="var(--accent)"
      strokeWidth={STROKE}
      className={className}
      style={style}
      aria-hidden
    >
      <ellipse cx={CX} cy={CY} rx={RX} ry={RY} />
      <line x1={CX - RX} y1={CY} x2={CX + RX} y2={CY} />
      <animated.ellipse
        cx={CX}
        cy={CY}
        rx={turn.to((v) => Math.max(MIN_RX, Math.abs(Math.cos(v)) * RX))}
        ry={RY}
      />
    </svg>
  );
};
