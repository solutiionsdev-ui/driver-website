"use client";

// 📖 Docs: obsidian/frontend/components/sections.md

import { useCallback, useEffect, useMemo, useRef, type RefObject } from "react";
import { easings, useSpring } from "@react-spring/web";

import { useHalftone, type HalftoneParams } from "./halftone-store";
import { DOTS, DOT_LATTICE, DOT_RADIUS } from "./map-dots";
import { MAP_VIEW } from "./map-vector";

/** Where the light is, in map units. `heat` 0 means there is no light. */
export interface HalftoneLight {
  x: number;
  y: number;
  heat: number;
}

export interface SeasonDotsProps {
  /** The lap's hot edge, written every frame by `season-circuit.tsx`. */
  lightRef: RefObject<HalftoneLight>;
  /**
   * Arms the pointer light. It stays off until the lap has run, so the reader
   * meets the block's own animation before their cursor can compete with it.
   *
   * A ref, read inside the frame loop, so arming it costs no render — see
   * `season-circuit.tsx` for why a re-render there is not survivable.
   */
  hover?: RefObject<boolean>;
  className?: string;
}

/** Backing-store cap. Past 2 the field costs more than it shows. */
/**
 * Backing-store cap for the map's canvas.
 *
 * **Per tier, because this canvas is not sized to the screen.** The stage it
 * draws into is the frame's own 1440x800 whatever the viewport is, so at 2x on
 * a phone the buffer came to 2880x1600 — 4.6 megapixels of decorative dot
 * field behind a 390-wide screen, paid for in memory and in fill on every
 * repaint. A phone gets 1 (optimize-3d-scene §6); the dots are soft and the
 * drop is invisible at that size.
 */
const MAX_RATIO =
  typeof window !== "undefined" &&
  window.matchMedia("(hover: none) and (pointer: coarse)").matches
    ? 1
    : 2;
/** Below this a dot has gone back to being a dot. */
const MIN_LEVEL = 0.02;
/** The wave runs across the map on this heading — along the long straight. */
const WAVE_ANGLE = (-20 * Math.PI) / 180;
/** Frame clock period. The value is unused; only its ticks matter. */
const CLOCK_MS = 2000;

/**
 * The pointer is a **reticle**, not a torch. A round light following the cursor
 * is the same effect every site has; the map already carries grid axes, a hub
 * and corner ticks, so the cursor reads far better as instrumentation. Two arms
 * run along the cursor's own lattice row and column, and where they cross the
 * dots go white.
 *
 * The arms are one dot thick and the field is sparse, so the crosshair is
 * broken by the geography it passes over — it draws the coastline as two lines
 * of type rather than washing a disc of the map.
 */
const POINTER_HEAT = 0.95;
/** How far each arm runs from the crossing, in map units, fully open. */
const RETICLE_OPEN = 420;
/**
 * The arms only open when the cursor settles. Above this speed, in map units
 * a second, they are fully retracted and the reticle is just its crossing —
 * so a cursor crossing the map is a point being tracked, and a cursor that
 * stops is a reading being taken. Retracting is quick and opening is not:
 * the reticle should feel like it is acquiring, not like it is flickering.
 */
const RETICLE_SETTLE = 900;
const SPREAD_OPEN = 0.38;
const SPREAD_SHUT = 0.09;
/** Arms sit under the crossing, so the centre still reads as the point. */
const RETICLE_ARM = 0.82;
/** The bloom at the crossing itself. */
const RETICLE_CORE = 54;
/** Seconds for the light to cover most of the gap to the cursor. */
const POINTER_TRAIL = 0.07;
/** Seconds to bring the light up on entry, and to put it out on exit. */
const POINTER_RISE = 0.14;
const POINTER_FALL = 0.3;
/** Exponential approach — frame-rate independent, unlike a flat lerp. */
const approach = (from: number, to: number, dt: number, tau: number) =>
  from + (to - from) * (1 - Math.exp(-dt / tau));

type Rgb = readonly [number, number, number];

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

const css = ([r, g, b]: Rgb) => `rgb(${r} ${g} ${b})`;

/**
 * The lit dot is a **chequer**, not a glyph.
 *
 * It read as ASCII first — the same ramp the lap's head used — and the ramp's
 * bright end is ` + * # `, so the cursor dragged a cluster of crosses over the
 * map. Crosses are the one mark this block cannot spend: the map already has
 * grid axes, a hub and corner ticks, and the reticle's own arms are crosses.
 *
 * A chequer is the thing a race actually ends on, and the block already draws
 * one at the finish. So a dot the light reaches squares up: the square grows
 * with the light, and the lattice's own parity decides whether it fills or
 * clears. At full strength the squares meet edge to edge and the patch is a
 * chequered flag laid over the coastline; below that it is the map dissolving
 * into one. The flag is drawn out of the *map's own dots*, so it stays the
 * geography rather than a panel dropped on top of it.
 */
/** Square side at full light, as a share of the lattice pitch. Over 1 the
 *  squares would overlap and the chequer would close up into a solid. */
const CHEQUER_FILL = 1;
/**
 * And at the threshold. It is **0.7 of the pitch, not the dot's own 0.45**:
 * tied to the dot's size the far half of each reticle arm drew squares barely
 * bigger than the dots they replaced, and the arms read as a faint dotted line
 * rather than as a chequer. The square has to arrive as a square; the light
 * level is carried by its colour, which is where it was carried before.
 */
const CHEQUER_SEED = 0.7;

/** Soft round falloff — the same shape the marker flares use. */
const falloff = (t: number) => {
  if (t >= 1) return 0;
  const u = 1 - t;
  return u * u;
};

/**
 * The halftone, lit.
 *
 * The dots are the map's landmass. Under a light they stop being dots and
 * become a **chequered flag**: whatever the light reaches crosses a threshold
 * and squares up, the squares growing until they meet edge to edge, and settles
 * back to a dot behind the light. See `CHEQUER_FILL` for why a chequer and not
 * the ASCII ramp this used to run.
 *
 * **How it holds a frame rate with 8,004 dots.** The resting field is baked
 * once into an offscreen canvas and blitted; only dots that are actually lit
 * are touched per frame, and they are found by arithmetic rather than by
 * search — the dots sit on a lattice, so the light asks for a range of rows and
 * columns and reads them out of a flat index. A dot that has faded leaves the
 * active list, so an idle field costs one blit and a dozen comparisons.
 *
 * Two ambient lights sit in the tuning panel, and **neither ships**: `edge` is
 * the lap's own hot head, handed down as a ref, and `wave` is a band that
 * crosses the map on its own schedule. `edge` lit the field as the trace drew,
 * so the block loaded through a travelling patch of chequers instead of laying
 * its line down cleanly; the shipped source is `none` and the cursor is the
 * only light. The wave keeps its sorted-along-the-heading index so each frame
 * is a binary search rather than a scan of the whole field.
 *
 * The **cursor** stacks on top of whichever of those is selected. It is a reticle rather than a torch: arms along the cursor's own
 * lattice row and column, bloom where they cross. It arms only once the lap
 * has finished, so the reader meets the block's own animation before their
 * pointer can compete with it, and it chases the cursor rather than tracking
 * it exactly — the lag is what stops the arms snapping between lattice lines.
 */
export const SeasonDots = ({ lightRef, hover, className }: SeasonDotsProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bakedRef = useRef<HTMLCanvasElement | null>(null);
  const paletteRef = useRef({
    dot: [122, 122, 122] as Rgb,
    accent: [2, 210, 227] as Rgb,
    bright: [141, 243, 250] as Rgb,
    white: [255, 255, 255] as Rgb,
  });

  const levelRef = useRef(new Float32Array(DOTS.count));
  const activeRef = useRef(new Int32Array(DOTS.count));
  const inListRef = useRef(new Uint8Array(DOTS.count));
  const activeCountRef = useRef(0);
  const phaseRef = useRef(0);
  const lastRef = useRef(0);
  const dirtyRef = useRef(true);

  // The pointer light lives in the same shape as the lap's, so it goes through
  // the same lattice query rather than a second code path. `target` is where
  // the cursor actually is; `pointerRef` is the light chasing it.
  const pointerRef = useRef<HalftoneLight>({ x: 0, y: 0, heat: 0 });
  const targetRef = useRef({ x: 0, y: 0, on: false });
  /** 0 arms shut, 1 arms fully out. Driven by how fast the cursor is going. */
  const spreadRef = useRef(0);

  const params = useHalftone();
  const paramsRef = useRef<HalftoneParams>(params);
  useEffect(() => {
    paramsRef.current = params;
    dirtyRef.current = true;
  }, [params]);

  /**
   * The lattice as a flat lookup, and the field sorted along the wave's
   * heading. Both are pure functions of the dot data, so they are built once.
   */
  const index = useMemo(() => {
    const { columns, rows, points, count } = DOTS;
    let minI = Infinity;
    let maxI = -Infinity;
    let minJ = Infinity;
    let maxJ = -Infinity;
    for (let i = 0; i < count; i += 1) {
      if (columns[i] < minI) minI = columns[i];
      if (columns[i] > maxI) maxI = columns[i];
      if (rows[i] < minJ) minJ = rows[i];
      if (rows[i] > maxJ) maxJ = rows[i];
    }
    const w = maxI - minI + 1;
    const h = maxJ - minJ + 1;
    const cell = new Int32Array(w * h).fill(-1);
    for (let i = 0; i < count; i += 1) {
      cell[(rows[i] - minJ) * w + (columns[i] - minI)] = i;
    }

    const dx = Math.cos(WAVE_ANGLE);
    const dy = Math.sin(WAVE_ANGLE);
    const projection = new Float32Array(count);
    for (let i = 0; i < count; i += 1) {
      projection[i] = points[i * 2] * dx + points[i * 2 + 1] * dy;
    }
    const order = Array.from({ length: count }, (_, i) => i).sort(
      (a, b) => projection[a] - projection[b],
    );
    const sorted = new Int32Array(order);
    const sortedProjection = Float32Array.from(order, (i) => projection[i]);

    return {
      cell,
      w,
      h,
      minI,
      minJ,
      dx,
      dy,
      sorted,
      sortedProjection,
      projectionMin: sortedProjection[0],
      projectionMax: sortedProjection[count - 1],
    };
  }, []);

  const drawRef = useRef<() => void>(() => {});

  /** The resting field, drawn once per size change. */
  const bake = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height) return;

    const ratio = Math.min(window.devicePixelRatio || 1, MAX_RATIO);
    const w = Math.round(width * ratio);
    const h = Math.round(height * ratio);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }

    const baked = bakedRef.current ?? document.createElement("canvas");
    bakedRef.current = baked;
    baked.width = w;
    baked.height = h;

    const context = baked.getContext("2d");
    if (!context) return;
    const scale = w / MAP_VIEW.width;
    context.setTransform(scale, 0, 0, scale, 0, 0);
    context.clearRect(0, 0, MAP_VIEW.width, MAP_VIEW.height);

    const { points, count } = DOTS;
    context.fillStyle = css(paletteRef.current.dot);
    context.beginPath();
    for (let i = 0; i < count; i += 1) {
      const x = points[i * 2];
      const y = points[i * 2 + 1];
      context.moveTo(x + DOT_RADIUS, y);
      context.arc(x, y, DOT_RADIUS, 0, Math.PI * 2);
    }
    context.fill();

    // Setting the canvas size cleared the visible layer, so put the field back
    // now rather than leaving it blank until the clock's first tick.
    dirtyRef.current = true;
    drawRef.current();
  }, []);

  /** Raise the dots the light reaches; returns how many it touched. */
  const light = useCallback(
    (p: HalftoneParams, dt: number) => {
      const level = levelRef.current;
      const active = activeRef.current;
      const inList = inListRef.current;
      const { points } = DOTS;
      const radius = Math.max(1, p.radius);

      const add = (i: number, value: number) => {
        if (value <= MIN_LEVEL) return;
        if (value > level[i]) level[i] = value;
        if (!inList[i]) {
          inList[i] = 1;
          active[activeCountRef.current] = i;
          activeCountRef.current += 1;
        }
      };

      /** A round light at a point: ask the lattice for its rows and columns. */
      const addPoint = (source: HalftoneLight, reach: number) => {
        if (source.heat <= 0.01) return;
        const { cell, w, h, minI, minJ } = index;
        const i0 = Math.floor(
          (source.x - reach - DOT_LATTICE.originX) / DOT_LATTICE.pitchX,
        );
        const i1 = Math.ceil(
          (source.x + reach - DOT_LATTICE.originX) / DOT_LATTICE.pitchX,
        );
        const j0 = Math.floor(
          (source.y - reach - DOT_LATTICE.originY) / DOT_LATTICE.pitchY,
        );
        const j1 = Math.ceil(
          (source.y + reach - DOT_LATTICE.originY) / DOT_LATTICE.pitchY,
        );
        for (
          let j = Math.max(minJ, j0);
          j <= Math.min(minJ + h - 1, j1);
          j += 1
        ) {
          const row = (j - minJ) * w;
          for (
            let i = Math.max(minI, i0);
            i <= Math.min(minI + w - 1, i1);
            i += 1
          ) {
            const idx = cell[row + (i - minI)];
            if (idx < 0) continue;
            const d = Math.hypot(
              points[idx * 2] - source.x,
              points[idx * 2 + 1] - source.y,
            );
            add(idx, falloff(d / reach) * source.heat);
          }
        }
      };

      /**
       * The reticle: the cursor's own lattice row and column, then a bloom
       * where they cross. Both arms are a straight walk of the flat index, so
       * the whole thing costs one row and one column of lookups.
       *
       * The arms fall off **linearly** where the round lights fall off
       * quadratically — a square law puts the far half of each arm under the
       * glyph threshold, and a crosshair that fades out after a third of its
       * length reads as a smudge rather than a line.
       */
      const addReticle = (source: HalftoneLight) => {
        if (source.heat <= 0.01) return;
        const { cell, w, h, minI, minJ } = index;
        const ci = Math.round(
          (source.x - DOT_LATTICE.originX) / DOT_LATTICE.pitchX,
        );
        const cj = Math.round(
          (source.y - DOT_LATTICE.originY) / DOT_LATTICE.pitchY,
        );
        const arm = RETICLE_ARM * source.heat;
        const reach = RETICLE_OPEN * spreadRef.current;

        if (reach > 1 && cj >= minJ && cj < minJ + h) {
          const row = (cj - minJ) * w;
          const span = Math.ceil(reach / DOT_LATTICE.pitchX);
          const from = Math.max(minI, ci - span);
          const to = Math.min(minI + w - 1, ci + span);
          for (let i = from; i <= to; i += 1) {
            const idx = cell[row + (i - minI)];
            if (idx < 0) continue;
            const d = Math.abs(points[idx * 2] - source.x);
            add(idx, (1 - d / reach) * arm);
          }
        }

        if (reach > 1 && ci >= minI && ci < minI + w) {
          const span = Math.ceil(reach / DOT_LATTICE.pitchY);
          const from = Math.max(minJ, cj - span);
          const to = Math.min(minJ + h - 1, cj + span);
          for (let j = from; j <= to; j += 1) {
            const idx = cell[(j - minJ) * w + (ci - minI)];
            if (idx < 0) continue;
            const d = Math.abs(points[idx * 2 + 1] - source.y);
            add(idx, (1 - d / reach) * arm);
          }
        }

        addPoint(source, RETICLE_CORE);
      };

      // The reticle stacks with whichever source the panel has selected —
      // `add` keeps the brighter claim on a dot, so the two never sum into a
      // blown-out patch.
      addReticle(pointerRef.current);

      // `none` ships: the cursor is the only light. See `halftone-store`.
      if (p.source === "none") return;

      if (p.source === "edge") {
        const source = lightRef.current;
        if (source) addPoint(source, radius);
        return;
      }

      // The wave: a band crossing the map, found by binary search on the dots
      // sorted along its heading.
      phaseRef.current = (phaseRef.current + dt * p.waveSpeed) % 1;
      const { sorted, sortedProjection, projectionMin, projectionMax } = index;
      const span = projectionMax - projectionMin + radius * 2;
      const centre = projectionMin - radius + phaseRef.current * span;
      const lo = centre - radius;
      const hi = centre + radius;

      let a = 0;
      let b = sortedProjection.length;
      while (a < b) {
        const m = (a + b) >> 1;
        if (sortedProjection[m] < lo) a = m + 1;
        else b = m;
      }
      for (let k = a; k < sortedProjection.length; k += 1) {
        const projection = sortedProjection[k];
        if (projection > hi) break;
        add(sorted[k], falloff(Math.abs(projection - centre) / radius));
      }
    },
    [index, lightRef],
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const baked = bakedRef.current;
    if (!canvas || !baked || !canvas.width) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const p = paramsRef.current;
    const scale = canvas.width / MAP_VIEW.width;
    context.setTransform(scale, 0, 0, scale, 0, 0);
    context.clearRect(0, 0, MAP_VIEW.width, MAP_VIEW.height);
    context.drawImage(baked, 0, 0, MAP_VIEW.width, MAP_VIEW.height);

    const level = levelRef.current;
    const active = activeRef.current;
    const count = activeCountRef.current;
    const { points, columns, rows } = DOTS;
    const { accent, bright, white } = paletteRef.current;

    // Two passes: every lit dot is lifted out of the baked field first, then
    // the chequer goes down. One pass would let a later dot's clear bite a
    // hole in a square already drawn, because a square at full light is wider
    // than the lattice pitch.
    const box = DOT_RADIUS * 2 + 1;
    const span = 1 - p.threshold || 1;
    let drew = 0;
    for (let k = 0; k < count; k += 1) {
      const idx = active[k];
      if (level[idx] < p.threshold) continue;
      context.clearRect(
        points[idx * 2] - DOT_RADIUS - 0.5,
        points[idx * 2 + 1] - DOT_RADIUS - 0.5,
        box,
        box,
      );
      drew += 1;
    }
    if (!drew) return;

    for (let k = 0; k < count; k += 1) {
      const idx = active[k];
      const value = level[idx];
      if (value < p.threshold) continue;
      // The dark half of the chequer: cleared above and left cleared, so the
      // pattern is drawn as much by what the light *takes* as by what it puts
      // down — which is what stops a lit patch reading as a solid block.
      if ((columns[idx] + rows[idx]) & 1) continue;

      const t = Math.min(1, (value - p.threshold) / span);
      const side =
        DOT_LATTICE.pitchX * (CHEQUER_SEED + (CHEQUER_FILL - CHEQUER_SEED) * t);
      context.fillStyle = css(
        value > 0.8 ? white : value > 0.5 ? bright : mix(accent, bright, value),
      );
      context.fillRect(
        points[idx * 2] - side / 2,
        points[idx * 2 + 1] - side / 2,
        side,
        side,
      );
    }
  }, []);

  useEffect(() => {
    drawRef.current = draw;
  }, [draw]);

  const frame = useCallback(() => {
    const now = performance.now();
    const dt = lastRef.current
      ? Math.min(0.1, (now - lastRef.current) / 1000)
      : 0;
    lastRef.current = now;

    const p = paramsRef.current;
    const level = levelRef.current;
    const active = activeRef.current;
    const inList = inListRef.current;

    // Walk the pointer light toward the cursor. The lag is the whole point:
    // a light with a little mass reads as something held over the map, where
    // a light pinned to the cursor reads as a hard mask.
    const pointer = pointerRef.current;
    const target = targetRef.current;
    const wanted = target.on ? POINTER_HEAT : 0;
    if (pointer.heat <= 0.001 && wanted > 0) {
      pointer.x = target.x;
      pointer.y = target.y;
    } else if (dt > 0) {
      const px = pointer.x;
      const py = pointer.y;
      pointer.x = approach(px, target.x, dt, POINTER_TRAIL);
      pointer.y = approach(py, target.y, dt, POINTER_TRAIL);
      // Measured off the light's own travel rather than the raw cursor, so a
      // mouse jumping between two frames does not read as a longer motion
      // than the light actually made.
      const speed = Math.hypot(pointer.x - px, pointer.y - py) / dt;
      const wantedSpread = Math.max(0, 1 - speed / RETICLE_SETTLE);
      spreadRef.current = approach(
        spreadRef.current,
        wantedSpread,
        dt,
        wantedSpread > spreadRef.current ? SPREAD_OPEN : SPREAD_SHUT,
      );
    }
    pointer.heat = approach(
      pointer.heat,
      wanted,
      dt,
      wanted > pointer.heat ? POINTER_RISE : POINTER_FALL,
    );
    // Out means shut: the reticle should acquire on the way back in rather
    // than reappearing already open.
    if (pointer.heat < 0.005) {
      pointer.heat = 0;
      spreadRef.current = 0;
    }

    // Fade what is already lit, and drop whatever has landed back.
    const decay = Math.exp(-dt / Math.max(0.05, p.fade / 3));
    let write = 0;
    for (let k = 0; k < activeCountRef.current; k += 1) {
      const idx = active[k];
      const value = level[idx] * decay;
      if (value > MIN_LEVEL) {
        level[idx] = value;
        active[write] = idx;
        write += 1;
      } else {
        level[idx] = 0;
        inList[idx] = 0;
      }
    }
    const before = activeCountRef.current;
    activeCountRef.current = write;

    light(p, dt);

    // An idle field repaints once and then stops asking for the blit.
    if (activeCountRef.current === 0 && before === 0 && !dirtyRef.current)
      return;
    dirtyRef.current = false;
    draw();
  }, [draw, light]);

  const frameRef = useRef(frame);
  useEffect(() => {
    frameRef.current = frame;
  }, [frame]);

  // One looping spring is the clock. It is `@react-spring/web` rather than a
  // hand-rolled loop so the block keeps a single animation source, and it is
  // paused out of view so an off-screen field costs nothing.
  const [, clock] = useSpring(() => ({
    from: { t: 0 },
    to: { t: 1 },
    loop: true,
    config: { duration: CLOCK_MS, easing: easings.linear },
    onChange: () => frameRef.current(),
  }));

  useEffect(() => {
    const styles = getComputedStyle(document.documentElement);
    const read = (name: string, fallback: Rgb) =>
      parseHex(styles.getPropertyValue(name)) ?? fallback;
    const accent = read("--accent", paletteRef.current.accent);
    const white = read("--foreground-on-dark", paletteRef.current.white);
    paletteRef.current = {
      dot: read("--map-dot", paletteRef.current.dot),
      accent,
      white,
      bright: mix(accent, white, 0.55),
    };
    bake();
  }, [bake]);

  /**
   * The cursor, in map units. The canvas is `inset-0` over the same box the
   * map's viewBox describes, so its own rect is the conversion — no need to
   * reach for the cover-fit the stage above it applies.
   *
   * `window` rather than the canvas: the canvas sits under the vector layer,
   * and a listener on it would be shadowed. The section's box is what decides
   * whether the light is on, so the cursor leaving the block puts it out.
   */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // A pointer light is a hover affordance and a moving one; neither belongs
    // on a touch screen or under a reduced-motion preference.
    if (!window.matchMedia("(hover: hover)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const host = canvas.closest("section");
    if (!host) return;

    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      // Read per event rather than per mount: the flag is a ref precisely so
      // that setting it does not re-render anything.
      if (!hover?.current) {
        targetRef.current.on = false;
        return;
      }
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const box = host.getBoundingClientRect();
      const target = targetRef.current;
      target.x = ((event.clientX - rect.left) / rect.width) * MAP_VIEW.width;
      target.y = ((event.clientY - rect.top) / rect.height) * MAP_VIEW.height;
      target.on =
        event.clientX >= box.left &&
        event.clientX <= box.right &&
        event.clientY >= box.top &&
        event.clientY <= box.bottom;
    };
    const release = () => {
      targetRef.current.on = false;
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", release);
    window.addEventListener("blur", release);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", release);
      window.removeEventListener("blur", release);
      release();
    };
  }, [hover]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(bake);
    observer.observe(canvas);
    window.addEventListener("resize", bake);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", bake);
    };
  }, [bake]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          lastRef.current = 0;
          clock.resume();
        } else {
          clock.pause();
        }
      },
      { threshold: 0 },
    );
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [clock]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={`absolute inset-0 size-full ${className ?? ""}`}
    />
  );
};
