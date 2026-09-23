"use client";

// 📖 Docs: obsidian/frontend/components/sections.md

import { useCallback, useEffect, useMemo, useRef } from "react";
import { easings, useSpring } from "@react-spring/web";

import { SeasonMap } from "./season-map";
import type { HalftoneLight } from "./season-dots";
import { FLAG_CUT, MAP_VIEW, artboardToMap, mapToArtboard } from "./map-vector";
import {
  CIRCUIT_MARKERS,
  CIRCUIT_PATH,
  CIRCUIT_STEP,
  CIRCUIT_VIEW,
  type CircuitPoint,
} from "./circuit-path";

export interface SeasonCircuitProps {
  className?: string;
}

/**
 * Seating the map SVG on the artboard. Its 2560x1440 frame is squarer than the
 * 1.807:1 artwork, so the art is banded top and bottom; undoing that band puts
 * the circuit back exactly where the raster used to have it.
 */
const ART_HEIGHT = MAP_VIEW.height - MAP_VIEW.band * 2;
const MAP_BOX = { top: 2, width: 1438.43, height: 796 };
/** Below this the stage is fitted to the **track** rather than covering. */
const NARROW_FIT = 1024;

/** Backing-store cap for the trace — 1 on touch, 2 elsewhere. */
const TRACE_MAX_RATIO =
  typeof window !== "undefined" &&
  window.matchMedia("(hover: none) and (pointer: coarse)").matches
    ? 1
    : 2;

/**
 * The circuit's own bounding box in the stage's coordinates, with a margin.
 *
 * Fitting the whole 1440x800 stage into a narrow band is what left the map
 * small, off-centre and with half the band empty: most of that stage is
 * decorative dotted landmass the design never shows at 1440 either, because
 * it covers and crops. Fitting the **trace** instead fills the band with the
 * thing the block is about, keeps the whole lap on screen, and lands the dots
 * far closer to the size they are drawn at — the sides crop, which is what
 * they do at every other width.
 */
const TRACK_BOX = (() => {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  // **Raw, not through `mapToArtboard`.** The lap is drawn straight into the
  // stage's own coordinates — `drawTrail` multiplies these numbers by the
  // stage scale — so this box is already in the space the fit works in.
  // Converting them first threw the trace off the band entirely.
  for (const [x, y] of CIRCUIT_PATH) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  /** Room for the ribbon's own width, its glow and the corner markers. */
  const pad = 46;
  return {
    x: minX - pad,
    y: minY - pad,
    width: maxX - minX + pad * 2,
    height: maxY - minY + pad * 2,
  };
})();

const MAP_RENDER = {
  width: MAP_BOX.width,
  height: (MAP_BOX.height * MAP_VIEW.height) / ART_HEIGHT,
  top: MAP_BOX.top - (MAP_VIEW.band * MAP_BOX.height) / ART_HEIGHT,
};

/** One lap, in ms. */
const LAP_MS = 6000;
/** The crisp core of the line. Measured off the backdrop: the raster's own
 *  track is 5.75 units across, so a thinner trail leaves a white fringe. */
const LINE_WIDTH = 5.9;
/**
 * The flag's gap, in the artboard units this canvas draws in.
 *
 * The SVG ribbon is cut at the finish, but the canvas draws its glow along the
 * whole lap on top of it — and a glow with no gap lays a cyan haze straight
 * over the chequers. The same cut has to happen here.
 */
const CUT_CENTRE = mapToArtboard(FLAG_CUT.x, FLAG_CUT.y);
const CUT_SCALE = 1438.43 / MAP_VIEW.width;
const CUT_ALONG = FLAG_CUT.along * CUT_SCALE;
const CUT_ACROSS = FLAG_CUT.across * CUT_SCALE;

/** The additive bloom around the head. */
const GLOW_WIDTH = 15;
/** The hot zone behind the tip, in units — where the line goes to ASCII. */
const HEAD_UNITS = 210;
/** How long the head takes to cool to a plain line once the lap is over. */
const COOL_MS = 800;
/** How far past a marker the arrival flare takes to settle, in units. */
const MARKER_POP_UNITS = 90;
/** How hard the corners slow the lap down. 0 = a metronome. */
const CORNER_BRAKE = 9;

/** Cumulative distance to each point — lets a lap fraction find its position. */
const CUMULATIVE = CIRCUIT_PATH.reduce<number[]>((acc, point, index) => {
  if (index === 0) return [0];
  const previous = CIRCUIT_PATH[index - 1];
  acc.push(
    acc[index - 1] + Math.hypot(point[0] - previous[0], point[1] - previous[1]),
  );
  return acc;
}, []);

/**
 * Lap length as this module measures it, not as `circuit-path.ts` rounds it.
 * The head is placed by distance, so a total half a unit off would stop the
 * lap that far short of the flag — which is exactly the seam the closed path
 * was meant to remove.
 */
const TOTAL = CUMULATIVE[CUMULATIVE.length - 1];

/**
 * Lap time at each point, 0-1.
 *
 * A constant-speed sweep is what made the first pass read as a fuse burning:
 * nothing about it said *car*. This re-times the same path so the lap slows
 * through the corners and runs away down the straights — the turn angle at each
 * point, smoothed over its neighbours so one noisy sample cannot brake the car,
 * becomes a speed, and each segment's duration is its length over that speed.
 */
const TIME_AT = (() => {
  const count = CIRCUIT_PATH.length;
  const turn = new Array<number>(count).fill(0);

  for (let i = 1; i < count - 1; i += 1) {
    const [ax, ay] = CIRCUIT_PATH[i - 1];
    const [bx, by] = CIRCUIT_PATH[i];
    const [cx, cy] = CIRCUIT_PATH[i + 1];
    const ux = bx - ax;
    const uy = by - ay;
    const vx = cx - bx;
    const vy = cy - by;
    const lengths = (Math.hypot(ux, uy) || 1) * (Math.hypot(vx, vy) || 1);
    turn[i] = Math.acos(
      Math.min(1, Math.max(-1, (ux * vx + uy * vy) / lengths)),
    );
  }

  const window = 6;
  const smoothed = turn.map((_, i) => {
    let sum = 0;
    let n = 0;
    for (
      let j = Math.max(0, i - window);
      j <= Math.min(count - 1, i + window);
      j += 1
    ) {
      sum += turn[j];
      n += 1;
    }
    return sum / n;
  });

  const accumulated = [0];
  for (let i = 1; i < count; i += 1) {
    const span = CUMULATIVE[i] - CUMULATIVE[i - 1];
    const speed = 1 / (1 + CORNER_BRAKE * smoothed[i]);
    accumulated.push(accumulated[i - 1] + span / speed);
  }

  const total = accumulated[count - 1] || 1;
  return accumulated.map((value) => value / total);
})();

/** Distance along the path at a given lap time. */
const distanceAtTime = (time: number): number => {
  if (time <= 0) return 0;
  if (time >= 1) return TOTAL;

  let low = 0;
  let high = TIME_AT.length - 1;
  while (low < high - 1) {
    const mid = (low + high) >> 1;
    if (TIME_AT[mid] <= time) low = mid;
    else high = mid;
  }
  const span = TIME_AT[high] - TIME_AT[low] || 1;
  const ratio = (time - TIME_AT[low]) / span;
  return CUMULATIVE[low] + (CUMULATIVE[high] - CUMULATIVE[low]) * ratio;
};

type Rgb = readonly [number, number, number];

interface Palette {
  accent: Rgb;
  bright: Rgb;
  white: Rgb;
}

const FALLBACK: Palette = {
  accent: [2, 210, 227],
  bright: [141, 243, 250],
  white: [255, 255, 255],
};

const parseHex = (value: string): Rgb | null => {
  const hex = value.trim().replace("#", "");
  if (hex.length !== 6) return null;
  const n = Number.parseInt(hex, 16);
  if (Number.isNaN(n)) return null;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const mix = (a: Rgb, b: Rgb, t: number): Rgb => [
  Math.round(a[0] + (b[0] - a[0]) * t),
  Math.round(a[1] + (b[1] - a[1]) * t),
  Math.round(a[2] + (b[2] - a[2]) * t),
];

const rgba = ([r, g, b]: Rgb, alpha: number) =>
  `rgb(${r} ${g} ${b} / ${alpha})`;

/** What react-spring hands `onChange` — only the animated value is of interest. */
interface SpringFrame {
  value: { lap: number };
}

interface CoolFrame {
  value: { heat: number };
}

/**
 * The lap trace: the circuit fills from the chequered flag, clockwise, in one
 * pass when the block scrolls into view.
 *
 * Two canvases do the work. The visible one is authored at 1440x800 — the same
 * space `circuit-path.ts` was traced in — and the whole stage is cover-fitted
 * over the section, so the trace and the raster underneath can never drift
 * apart. The second is offscreen at one pixel per glyph cell: drawing the same
 * trail into it gives a luminance reading per cell for the price of one
 * `getImageData`, and every cell brighter than the threshold is punched out of
 * the smooth line and re-set as an ASCII glyph. That is what turns the hot
 * leading edge — and only the leading edge — into type.
 *
 * Motion is a `@react-spring/web` spring, so the app's `ReducedMotion` mount
 * makes it jump straight to the finished lap (ADR-0014, and see
 * obsidian/frontend/animation-system.md).
 */
export const SeasonCircuit = ({ className }: SeasonCircuitProps) => {
  const frameRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const paletteRef = useRef<Palette>(FALLBACK);
  const drawnRef = useRef(-1);
  /** 1 while the car is running, 0 once the head has cooled. */
  const heatRef = useRef(1);
  /** Handed to the halftone: where the hot edge is, and how hot. */
  const lightRef = useRef<HalftoneLight>({ x: 0, y: 0, heat: 0 });

  /** Points up to a distance, plus the partial segment, so the head lands exactly. */
  const trailUpTo = useCallback((distance: number): CircuitPoint[] => {
    const out: CircuitPoint[] = [];
    for (let i = 0; i < CIRCUIT_PATH.length; i += 1) {
      if (CUMULATIVE[i] <= distance) {
        out.push(CIRCUIT_PATH[i]);
        continue;
      }
      const a = CIRCUIT_PATH[i - 1];
      const b = CIRCUIT_PATH[i];
      const ratio =
        (distance - CUMULATIVE[i - 1]) / (CUMULATIVE[i] - CUMULATIVE[i - 1]);
      out.push([a[0] + (b[0] - a[0]) * ratio, a[1] + (b[1] - a[1]) * ratio]);
      break;
    }
    return out;
  }, []);

  /** Lay a polyline down; `from` clips it to a tail of the trail. */
  const stroke = useCallback(
    (
      context: CanvasRenderingContext2D,
      points: CircuitPoint[],
      scale: number,
      from = 0,
    ) => {
      context.beginPath();
      context.moveTo(points[from][0] * scale, points[from][1] * scale);
      for (let i = from + 1; i < points.length; i += 1) {
        context.lineTo(points[i][0] * scale, points[i][1] * scale);
      }
      context.stroke();
    },
    [],
  );

  /** The trail. `glow` adds the two additive bloom passes around the head. */
  const drawTrail = useCallback(
    (
      context: CanvasRenderingContext2D,
      points: CircuitPoint[],
      scale: number,
      minWidth: number,
      glow: boolean,
      heat: number,
    ) => {
      if (points.length < 2) return;
      const palette = paletteRef.current;
      const width = Math.max(minWidth, LINE_WIDTH * scale);

      context.lineCap = "round";
      context.lineJoin = "round";

      if (glow) {
        context.save();
        context.globalCompositeOperation = "lighter";
        context.strokeStyle = rgba(palette.accent, 0.05);
        context.lineWidth = GLOW_WIDTH * scale;
        stroke(context, points, scale);
        context.strokeStyle = rgba(palette.accent, 0.1);
        context.lineWidth = GLOW_WIDTH * 0.45 * scale;
        stroke(context, points, scale);
        context.restore();
      }

      // The hot zone: accent into the light accent, at the *same* width. The
      // first pass widened it by 15%, which is what gave the tip its match-head.
      const head = Math.max(2, Math.round(HEAD_UNITS / CIRCUIT_STEP));
      const from = Math.max(0, points.length - head);
      const tip = points[points.length - 1];
      const hot = context.createLinearGradient(
        points[from][0] * scale,
        points[from][1] * scale,
        tip[0] * scale,
        tip[1] * scale,
      );
      // Cooling walks the tip's colour back to the body's, so at rest there is
      // no hot spot parked on the finish line — just a closed cyan lap.
      hot.addColorStop(0, rgba(palette.accent, 0));
      hot.addColorStop(0.45, rgba(palette.accent, 0.9));
      hot.addColorStop(1, rgba(mix(palette.accent, palette.bright, heat), 1));
      context.strokeStyle = hot;
      context.lineWidth = width;
      stroke(context, points, scale, from);

      // A filament down the middle of the last third — the only white on the
      // canvas, and thinner than the line it sits inside.
      const coreFrom = Math.max(0, points.length - Math.round(head * 0.42));
      if (points.length - coreFrom > 1) {
        const core = context.createLinearGradient(
          points[coreFrom][0] * scale,
          points[coreFrom][1] * scale,
          tip[0] * scale,
          tip[1] * scale,
        );
        core.addColorStop(0, rgba(palette.bright, 0));
        core.addColorStop(1, rgba(palette.white, 0.95 * heat));
        context.strokeStyle = core;
        context.lineWidth = Math.max(minWidth * 0.6, width * 0.38);
        stroke(context, points, scale, coreFrom);
      }
    },
    [stroke],
  );

  const render = useCallback(
    (progress: number) => {
      const context = contextRef.current;
      if (!context) return;

      const palette = paletteRef.current;
      const { width, height } = CIRCUIT_VIEW;
      const distance = distanceAtTime(progress);
      const points = trailUpTo(distance);
      const heat = heatRef.current;

      context.clearRect(0, 0, width, height);

      // Publish the hot edge for the halftone. It reads in map units, so the
      // conversion happens once here rather than per dot.
      if (points.length > 1 && heat > 0.01) {
        const [lx, ly] = artboardToMap(
          points[points.length - 1][0],
          points[points.length - 1][1],
        );
        lightRef.current.x = lx;
        lightRef.current.y = ly;
        lightRef.current.heat = heat;
      } else {
        lightRef.current.heat = 0;
      }

      if (points.length > 1) {
        drawTrail(context, points, 1, 0.6, true, heat);

        // The spark at the very tip, additive so it reads as light rather than
        // a dot of paint sitting on the line.
        const [tx, ty] = points[points.length - 1];
        context.save();
        context.globalCompositeOperation = "lighter";
        const spark = context.createRadialGradient(
          tx,
          ty,
          0,
          tx,
          ty,
          LINE_WIDTH * 2.6,
        );
        spark.addColorStop(0, rgba(palette.white, 0.85 * heat));
        spark.addColorStop(0.35, rgba(palette.bright, 0.4 * heat));
        spark.addColorStop(1, rgba(palette.accent, 0));
        context.fillStyle = spark;
        context.beginPath();
        context.arc(tx, ty, LINE_WIDTH * 2.6, 0, Math.PI * 2);
        context.fill();
        context.restore();
      }

      // Punch the finish out of everything the canvas just drew, so the glow
      // stops at the flag exactly as the ribbon does.
      context.save();
      context.translate(CUT_CENTRE[0], CUT_CENTRE[1]);
      context.rotate((FLAG_CUT.angle * Math.PI) / 180);
      context.clearRect(-CUT_ALONG / 2, -CUT_ACROSS / 2, CUT_ALONG, CUT_ACROSS);
      context.restore();

      for (const marker of CIRCUIT_MARKERS) {
        if (distance < marker.d) continue;

        const age = Math.min(1, (distance - marker.d) / MARKER_POP_UNITS);
        const radius = 12 + (1 - age) * 14;
        const glow = context.createRadialGradient(
          marker.x,
          marker.y,
          0,
          marker.x,
          marker.y,
          radius,
        );
        glow.addColorStop(0, rgba(palette.bright, 0.5 + 0.45 * (1 - age)));
        glow.addColorStop(0.45, rgba(palette.accent, 0.32));
        glow.addColorStop(1, rgba(palette.accent, 0));
        context.save();
        context.globalCompositeOperation = "lighter";
        context.fillStyle = glow;
        context.beginPath();
        context.arc(marker.x, marker.y, radius, 0, Math.PI * 2);
        context.fill();
        context.restore();

        if (age < 1) {
          context.strokeStyle = rgba(palette.bright, (1 - age) * 0.6);
          context.lineWidth = 1;
          context.beginPath();
          context.arc(marker.x, marker.y, 9 + age * 20, 0, Math.PI * 2);
          context.stroke();
        }
      }
    },
    [drawTrail, trailUpTo],
  );

  // The spring's own frame callback drives the canvas. An in-view render loop
  // was tried first and stalled the lap partway: the shared ticker's loop puts
  // itself to sleep ten frames after the block leaves the viewport, and the
  // section is out of view for the whole of the page's first paint. Driving the
  // draw from the spring ties the work to exactly the window it is needed in.
  const renderRef = useRef(render);
  useEffect(() => {
    renderRef.current = render;
  }, [render]);

  const lapRef = useRef(0);

  /**
   * The lap is over and the head has cooled, so the cursor light may take over.
   *
   * A **ref, not state**, and that is load-bearing: this component must never
   * re-render. `useSpring` here hands react-spring a declared `lap: 0`, and on
   * a re-render the library reconciles the spring back toward that declaration
   * — so the fill runs smoothly backwards to empty over another `LAP_MS`. It
   * lay hidden for as long as nothing here re-rendered; wiring the cursor light
   * through `useState` gave the component its first ever re-render, landing
   * exactly on the lap's finish, and the track un-filled itself.
   *
   * Measured in headless Chrome over the real page: forward 4863.6 -> 60 in
   * 6.0s, then backward 60 -> 4865.6 starting at 6.8s, which is the moment the
   * flag flipped — the canvas trail retreating with it, 19,052 lit pixels down
   * to 255, so it was the spring itself and not the mask's interpolation.
   * Passing an empty deps array to `useSpring` does *not* prevent it.
   *
   * The consumer reads this ref inside its own frame loop, so arming the light
   * costs no render at all.
   */
  const armedRef = useRef(false);

  // A second spring, started when the lap rests, walks the head's heat back to
  // zero. Without it the tip stays lit on the finish line for as long as the
  // page is open, which is the one frame every reader ends up looking at.
  const [, coolApi] = useSpring(() => ({
    heat: 1,
    config: { duration: COOL_MS, easing: easings.easeOutCubic },
    onChange: (result: CoolFrame) => {
      heatRef.current = result.value.heat;
      renderRef.current(lapRef.current);
    },
    // The cursor light waits for this. The guard is because a spring that has
    // never been told to move rests at mount, and the lap has not run then.
    onRest: () => {
      if (lapRef.current < 1) return;
      armedRef.current = true;
    },
  }));

  const [{ lap }, api] = useSpring(() => ({
    lap: 0,
    // Easing only takes the edge off the start and the stop; the *pacing* of
    // the lap lives in `TIME_AT`, which is where the corners are.
    config: { duration: LAP_MS, easing: easings.easeInOutSine },
    onChange: (result: SpringFrame) => {
      const progress = result.value.lap;
      if (progress === drawnRef.current) return;
      drawnRef.current = progress;
      lapRef.current = progress;
      renderRef.current(progress);
    },
    onRest: () => {
      if (lapRef.current < 1) return;
      coolApi.start({ heat: 0 });
    },
  }));

  // The mask rides the same time->distance curve as the head, so the ribbon's
  // fill and the hot edge stay locked together through the corners. The fill
  // can only ever grow, and that is a property rather than a hope: `lap` is a
  // one-shot 0->1 spring on a monotonic easing, and `TIME_AT` and `CUMULATIVE`
  // are both strictly increasing, so `distanceAtTime` never decreases.
  //
  // Memoised so it survives a re-render rather than being rebuilt as a fresh
  // `Interpolation`. Belt and braces: `armedRef` explains why this component
  // must not re-render at all, and a re-render breaks far more than this.
  const reveal = useMemo(
    () => lap.to((value) => 1 - distanceAtTime(value) / TOTAL),
    [lap],
  );

  /** Fit the authored stage over the section — see the scale below. */
  const fit = useCallback(() => {
    const frame = frameRef.current;
    const stage = stageRef.current;
    if (!frame || !stage) return;

    const { clientWidth: w, clientHeight: h } = frame;
    if (!w || !h) return;

    const { width, height } = CIRCUIT_VIEW;
    // Cover down to 1024, **contain** below it. Cover takes whichever axis
    // needs more, and on a portrait screen that is always the height: at
    // 768x1024 it drew the 1440-wide stage at 1.28 and cropped a third of the
    // map off either side, which is why the world came out gigantic and
    // off-centre. Fitting the width instead lands the whole map on screen and
    // the vertical centring below does the rest. 1024 and up keep cover, so
    // every width already signed off is untouched.
    // Cover down to 1024. Below it cover is wrong — on a portrait screen it
    // takes the height and crops a third of the map off either side — but
    // plain contain is wrong too: the stage ends inside the block and its grid
    // lines stop in mid air with nothing carrying them. `NARROW_ZOOM` past the
    // width is the middle: the map reads at a proper size and the grid runs
    // off both edges, which is what it does at every other width.
    // Cover from 1024 up. Below it, **fit the width exactly** — measured at
    // 768, zooming past the width put the stage 328px off each edge, which is
    // the map running off the screen. The grid that used to run with it is
    // carried by its own full-height layer instead; see `season/index.tsx`.
    // Cover everywhere. Contain was tried below 1024 and the map came out a
    // small band floating in a tall block; the block is now cut to 64vh,
    // which is close enough to the frame's own 1440:800 that cover crops only
    // the far edges — and the grid runs to both sides of the block, which is
    // what it does at every other width.
    // Cover from `lg` up, as the frame has it. Below that the map is a band
    // in the column rather than a backdrop, and the whole circuit has to be
    // inside it — cover crops whichever axis is long, and on this band that
    // is always the sides, taking the trace's ends with it. `min` contains.
    if (w >= NARROW_FIT) {
      const scale = Math.max(w / width, h / height);
      stage.style.transform = `translate(${(w - width * scale) / 2}px, ${
        (h - height * scale) / 2
      }px) scale(${scale})`;
      return;
    }

    // Narrow: fit the **trace to the width** and centre it. The stage stays a
    // full-block backdrop, so the grid and the axes run to the top and bottom
    // edges the way they do at 1440 — only the trace is scaled to fit, and
    // the dotted landmass crops at the sides as it does there.
    const scale = w / TRACK_BOX.width;
    const cx = TRACK_BOX.x + TRACK_BOX.width / 2;
    const cy = TRACK_BOX.y + TRACK_BOX.height / 2;
    stage.style.transform = `translate(${w / 2 - cx * scale}px, ${
      h / 2 - cy * scale
    }px) scale(${scale})`;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return;

    contextRef.current = context;

    // Tokens are the source of truth for the trace's colours too.
    const styles = getComputedStyle(document.documentElement);
    const accent =
      parseHex(styles.getPropertyValue("--accent")) ?? FALLBACK.accent;
    const white =
      parseHex(styles.getPropertyValue("--foreground-on-dark")) ??
      FALLBACK.white;
    paletteRef.current = { accent, white, bright: mix(accent, white, 0.55) };

    // Crisp on retina without disturbing the authored coordinate space.
    // Per tier: the trace is drawn into the frame's own 1440-wide stage, not
    // into the screen, so 2x on a phone buys a 2876x1618 buffer nothing can
    // resolve — see the note on `MAX_RATIO` in `season-dots`.
    const ratio = Math.min(window.devicePixelRatio || 1, TRACE_MAX_RATIO);
    canvas.width = CIRCUIT_VIEW.width * ratio;
    canvas.height = CIRCUIT_VIEW.height * ratio;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);

    drawnRef.current = -1;
    render(0);
  }, [render]);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(frame);
    // Some browsers skip the observer when only the viewport changes.
    window.addEventListener("resize", fit);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", fit);
    };
  }, [fit]);

  // One pass, when the block arrives.
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        api.start({ lap: 1 });
      },
      { threshold: 0.35 },
    );
    observer.observe(frame);
    return () => observer.disconnect();
  }, [api]);

  return (
    <div
      ref={frameRef}
      // The backdrop dissolves into the surface at the top and bottom rather
      // than being sliced by the section edge. Without it the map's three
      // dashed axes and its dot field stop dead on the boundary, and the seam
      // with the block below reads as two slabs butted together. A *share*
      // rather than a length because the stage is cover-fitted, so the fade
      // scales with it; at 10% the lap never enters the fade — the track sits
      // 13.4% down from the top at the closest, with the copy and the plate
      // outside this element entirely.
      // The edge fade dissolves the map into the blocks above and below it,
      // which is what a full-bleed backdrop needs. Below `lg` the map is a
      // band inside the column with its own margins, so there is nothing to
      // dissolve into and the fade only ate the top and bottom of the track.
      className={`absolute inset-0 overflow-hidden [mask-image:linear-gradient(to_bottom,transparent_0,#000_var(--edge-fade-share),#000_calc(100%-var(--edge-fade-share)),transparent_100%)] max-lg:[mask-image:none] ${className ?? ""}`}
    >
      <div
        ref={stageRef}
        className="absolute left-0 top-0 h-[800px] w-[1440px] origin-top-left"
      >
        <SeasonMap
          lightRef={lightRef}
          reveal={reveal}
          hover={armedRef}
          className="absolute left-0 max-w-none select-none"
          style={{
            top: `${MAP_RENDER.top}px`,
            width: `${MAP_RENDER.width}px`,
            height: `${MAP_RENDER.height}px`,
          }}
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-[800px] w-[1440px]"
        />
      </div>
    </div>
  );
};
