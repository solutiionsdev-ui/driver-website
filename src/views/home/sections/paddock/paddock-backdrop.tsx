"use client";

// 📖 Docs: obsidian/frontend/components/sections.md

import { useCallback, useEffect, useRef } from "react";

import { useLoopInView } from "@/hooks/animation/use-loop-in-view";

export interface PaddockBackdropProps {
  className?: string;
}

/**
 * The hero's own field, and its own numbers — `DEFAULT_PARAMS` in
 * `hero-scene/scene.ts`. Kept identical on purpose: this is meant to read as
 * the same backdrop, not as a second one that resembles it.
 */
const LINE_SCALE = 3.8;
const LINE_COUNT = 2.5;
const WAVE_AMOUNT = 0.37;
const WAVE_SPEED = 1.66;
const LINE_OPACITY = 0.85;

/** Grid the contours are marched over, in cells across the long edge. */
const CELLS = 96;
/** Backing-store cap. Past 2 the lines cost more than they show. */
const MAX_RATIO = 2;

/**
 * Four sines at incommensurate frequencies, two of them diagonal — the hero's
 * `backdropField`, character for character. The shader's note explains the
 * choice: a noise *texture* is low-resolution and tiling, so its contours come
 * out ragged, while an analytic field is continuous everywhere and every
 * iso-line is one unbroken curve however far it is scaled.
 */
const field = (x: number, y: number, t: number) => {
  let f = Math.sin(x * 1.0 + t * 0.6) * 0.5;
  f += Math.sin(y * 0.85 - t * 0.45) * 0.45;
  f += Math.sin((x + y) * 0.65 + t * 0.35) * 0.35;
  f += Math.sin((x - y) * 0.95 - t * 0.55) * 0.25;
  return f * 0.5 + 0.5;
};

/**
 * The block's background: the hero's animated contours, in 2D.
 *
 * The design ships this as a static SVG — a boolean union of nine curves — and
 * the hero already made the same call the other way: its own comment says the
 * lines are "procedural rather than the Figma backdrop SVG". Same field, same
 * constants, same rolling displacement; the only difference is that the hero
 * slices its field in a fragment shader and this marches it on a grid, because
 * a whole WebGL context for one background is not a trade worth making.
 *
 * **Marching squares, not a per-pixel test.** The field is evaluated once per
 * grid vertex per frame and every contour level reuses that grid, so the cost
 * is ~4,000 sine-heavy samples a frame however many bands are drawn.
 */
export const PaddockBackdrop = ({ className }: PaddockBackdropProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const colourRef = useRef("rgb(9 10 11 / 0.06)");
  const startRef = useRef(0);

  const draw = useCallback(() => {
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

    const context = canvas.getContext("2d");
    if (!context) return;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);

    if (!startRef.current) startRef.current = performance.now();
    const t = ((performance.now() - startRef.current) / 1000) * WAVE_SPEED;

    // The grid, in cells. The long edge gets `CELLS`; the short one keeps the
    // cells square so the contours are not stretched along one axis.
    const cols =
      width >= height
        ? CELLS
        : Math.max(8, Math.round((CELLS * width) / height));
    const rows = Math.max(8, Math.round((cols * height) / width));
    const stepX = width / cols;
    const stepY = height / rows;
    const aspect = width / height;

    // One pass over the vertices; every level reads this back.
    const values = new Float32Array((cols + 1) * (rows + 1));
    for (let j = 0; j <= rows; j += 1) {
      for (let i = 0; i <= cols; i += 1) {
        // Normalised device coordinates, so the field is framed the way the
        // hero frames it rather than by this element's pixel size.
        const nx = ((i / cols) * 2 - 1) * aspect * LINE_SCALE;
        const ny = ((j / rows) * 2 - 1) * LINE_SCALE;
        // Two out-of-phase displacements, one per axis: a single sine reads as
        // a flag rippling; crossing them makes the whole field roll.
        const qx = nx + Math.sin(ny * 0.8 + t * 0.7) * WAVE_AMOUNT;
        const qy = ny + Math.cos(nx * 0.7 - t * 0.6) * WAVE_AMOUNT;
        values[j * (cols + 1) + i] = field(qx, qy, t) * LINE_COUNT;
      }
    }

    context.strokeStyle = colourRef.current;
    context.lineWidth = 1;
    context.globalAlpha = LINE_OPACITY;
    context.beginPath();

    // The lines sit halfway between integers — the same place the shader puts
    // them, so the two backdrops draw the same curves.
    for (let level = 0.5; level < LINE_COUNT; level += 1) {
      for (let j = 0; j < rows; j += 1) {
        for (let i = 0; i < cols; i += 1) {
          const a = values[j * (cols + 1) + i];
          const b = values[j * (cols + 1) + i + 1];
          const c = values[(j + 1) * (cols + 1) + i + 1];
          const d = values[(j + 1) * (cols + 1) + i];
          const index =
            (a > level ? 8 : 0) |
            (b > level ? 4 : 0) |
            (c > level ? 2 : 0) |
            (d > level ? 1 : 0);
          if (index === 0 || index === 15) continue;

          const x0 = i * stepX;
          const y0 = j * stepY;
          const top = [x0 + stepX * ((level - a) / (b - a)), y0] as const;
          const right = [
            x0 + stepX,
            y0 + stepY * ((level - b) / (c - b)),
          ] as const;
          const bottom = [
            x0 + stepX * ((level - d) / (c - d)),
            y0 + stepY,
          ] as const;
          const left = [x0, y0 + stepY * ((level - a) / (d - a))] as const;

          const segment = (
            p: readonly [number, number],
            q: readonly [number, number],
          ) => {
            context.moveTo(p[0], p[1]);
            context.lineTo(q[0], q[1]);
          };

          switch (index) {
            case 1:
            case 14:
              segment(left, bottom);
              break;
            case 2:
            case 13:
              segment(bottom, right);
              break;
            case 3:
            case 12:
              segment(left, right);
              break;
            case 4:
            case 11:
              segment(top, right);
              break;
            case 6:
            case 9:
              segment(top, bottom);
              break;
            case 7:
            case 8:
              segment(left, top);
              break;
            // The saddles: two lines through one cell.
            case 5:
              segment(left, top);
              segment(bottom, right);
              break;
            case 10:
              segment(left, bottom);
              segment(top, right);
              break;
            default:
              break;
          }
        }
      }
    }

    context.stroke();
    context.globalAlpha = 1;
  }, []);

  useEffect(() => {
    const styles = getComputedStyle(document.documentElement);
    colourRef.current =
      styles.getPropertyValue("--paddock-contour").trim() ||
      "rgb(9 10 11 / 0.06)";
    draw();
  }, [draw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [draw]);

  // Off screen it costs nothing — the shared ticker sleeps the subscriber ten
  // frames after the canvas leaves the viewport. `useLoopInView` types its ref
  // as a div; the season block hands it a canvas the same way.
  useLoopInView(canvasRef as unknown as React.RefObject<HTMLDivElement>, draw, {
    framerate: 24,
  });

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={`pointer-events-none block size-full ${className ?? ""}`}
    />
  );
};
