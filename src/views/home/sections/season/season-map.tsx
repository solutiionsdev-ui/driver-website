"use client";

// 📖 Docs: obsidian/frontend/components/sections.md

import {
  useEffect,
  useId,
  useRef,
  type CSSProperties,
  type RefObject,
} from "react";
import {
  animated,
  easings,
  useSpring,
  type Interpolation,
  type SpringValue,
} from "@react-spring/web";

import { SeasonDots, type HalftoneLight } from "./season-dots";
import {
  CORNER_MARKS,
  CORNER_MARK_SIZE,
  FLAG_CUT,
  FLAG_DIAMONDS,
  GRID_AXES_X,
  GRID_AXIS_Y,
  GRID_DASH,
  GRID_STROKE,
  HUB,
  LAP_CENTRELINE,
  LAP_LENGTH,
  LAP_MASK_WIDTH,
  MAP_VIEW,
  RINGS,
  TRACK_RIBBON,
  TURN_POINTS,
  TURNS,
} from "./map-vector";

export interface SeasonMapProps {
  /** The lap's hot edge, for the halftone to read as a light. */
  lightRef: RefObject<HalftoneLight>;
  /**
   * 1 hides the lap, 0 shows all of it. It is the mask's `stroke-dashoffset`,
   * so it must already carry the lap's *distance*, not its time — the pacing
   * lives in `season-circuit.tsx`.
   */
  reveal: SpringValue<number> | Interpolation<number, number>;
  /**
   * Flipped true once the lap has run, arming the halftone's cursor light. A
   * ref rather than a boolean so nothing up the tree has to re-render to set
   * it — see `season-circuit.tsx`, where a re-render un-fills the lap.
   */
  hover?: RefObject<boolean>;
  className?: string;
  style?: CSSProperties;
}

/** One crawl of the dashed grid, in ms. Slow enough to notice only if you look. */
const DRIFT_MS = 7000;
/** One ping out from the hub. */
const PING_MS = 4200;
/** How far the ping travels before it is gone, in map units. */
const PING_REACH = 86;
/** The dashes' own period, so the drift loops seamlessly. */
/** How far the axes are drawn past the artboard, in its own units. */
const GRID_OVERRUN = 4000;

const DASH_PERIOD = GRID_DASH.split(" ").reduce((a, b) => a + Number(b), 0);

/**
 * The block's artwork, as vector.
 *
 * The circuit is the designer's own path (`TRACK_RIBBON`) — a filled ribbon of
 * varying width — drawn twice: once in the resting colour, once in the accent
 * under a mask. The mask is the lap centreline stroked wide, with its dash
 * offset animated, so the accent copy is uncovered *along the lap* and the fill
 * has the designed shape at every point instead of a constant-width stroke
 * standing in for it. That is the whole reason this stopped being a raster.
 *
 * The halftone is `<SeasonDots/>`, a canvas. It was an `<img>` of one 8,011-dot
 * path while nothing about it moved; a light has to address dots one at a time,
 * which a single path cannot do at all.
 */
export const SeasonMap = ({
  lightRef,
  reveal,
  hover,
  className,
  style,
}: SeasonMapProps) => {
  // Two of these can share a page (a second block, a story), and duplicate
  // fragment ids would cross-wire their masks.
  const uid = useId().replace(/:/g, "");
  const maskId = `lap-${uid}`;
  const turnId = `turn-${uid}`;
  const cutId = `cut-${uid}`;
  const rootRef = useRef<HTMLDivElement>(null);

  // Two ambient loops, both deliberately slight: the dashed grid crawls a
  // dash every seven seconds, and the hub sends a ping out through the rings.
  // The frame is an instrument panel, and an instrument panel is never quite
  // still — but neither should it compete with the lap.
  const [{ drift }, driftApi] = useSpring(() => ({
    from: { drift: 0 },
    to: { drift: DASH_PERIOD },
    loop: true,
    config: { duration: DRIFT_MS, easing: easings.linear },
  }));

  const [{ ping }, pingApi] = useSpring(() => ({
    from: { ping: 0 },
    to: { ping: 1 },
    loop: true,
    config: { duration: PING_MS, easing: easings.easeOutQuad },
  }));

  // Off screen they cost nothing.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          driftApi.resume();
          pingApi.resume();
        } else {
          driftApi.pause();
          pingApi.pause();
        }
      },
      { threshold: 0 },
    );
    observer.observe(root);
    return () => observer.disconnect();
  }, [driftApi, pingApi]);

  return (
    <div ref={rootRef} className={`relative ${className ?? ""}`} style={style}>
      <SeasonDots lightRef={lightRef} hover={hover} />

      <svg
        viewBox={`0 0 ${MAP_VIEW.width} ${MAP_VIEW.height}`}
        // `overflow-visible`: an SVG clips to its own viewBox by default, so
        // the axes' overrun would be cut at the artboard edge — the very
        // thing it exists to get past. The frame around the stage is what
        // clips them instead, at the block's edges.
        className="absolute inset-0 size-full overflow-visible"
        aria-hidden
      >
        <defs>
          <polygon id={turnId} points={TURN_POINTS} />

          {/* The ribbon stops for the flag: in the frame the line ends on the
              approach and picks up on the far side, and the chequers fill the
              gap. Without this the lap rides over the finish. */}
          <mask id={cutId}>
            <rect width="100%" height="100%" fill="#fff" />
            <rect
              x={FLAG_CUT.x - FLAG_CUT.along / 2}
              y={FLAG_CUT.y - FLAG_CUT.across / 2}
              width={FLAG_CUT.along}
              height={FLAG_CUT.across}
              fill="#000"
              transform={`rotate(${FLAG_CUT.angle} ${FLAG_CUT.x} ${FLAG_CUT.y})`}
            />
          </mask>

          <mask id={maskId}>
            <animated.path
              d={LAP_CENTRELINE}
              fill="none"
              stroke="#fff"
              strokeWidth={LAP_MASK_WIDTH}
              strokeLinecap="round"
              strokeLinejoin="round"
              // One dash as long as the whole path, slid out of the way and
              // back in. `LAP_LENGTH` is exact because the path is a polyline,
              // so this needs neither `pathLength` nor a runtime measurement.
              // The dash is longer than the path by the mask's own width at
              // each end, so at rest the whole run — round caps included — sits
              // outside the path and no cyan stub is left on the start line.
              // The offset is solved for it: revealed length = (1 - v) x length.
              strokeDasharray={LAP_LENGTH + LAP_MASK_WIDTH * 2}
              strokeDashoffset={reveal.to(
                (v) => LAP_MASK_WIDTH * 2 + v * LAP_LENGTH,
              )}
            />
          </mask>
        </defs>

        <g id="grid">
          <animated.g
            stroke="var(--map-grid)"
            strokeWidth={GRID_STROKE}
            strokeDasharray={GRID_DASH}
            strokeDashoffset={drift}
          >
            {/* **Drawn past the artboard on purpose.** The axes are the
                instrument's own rule lines and have to reach the block's
                edges; ending them at the artboard left them stopping in mid
                air wherever the block is taller than the map — which is every
                narrow width, where the stage is fitted to the trace rather
                than covering. The frame clips them, so `GRID_OVERRUN` only
                has to be larger than any block. Nothing changes from `lg` up,
                where the stage already covers past both edges. */}
            {GRID_AXES_X.map((x) => (
              <line
                key={x}
                x1={x}
                y1={-GRID_OVERRUN}
                x2={x}
                y2={MAP_VIEW.height + GRID_OVERRUN}
              />
            ))}
            <line
              x1={-GRID_OVERRUN}
              y1={GRID_AXIS_Y}
              x2={MAP_VIEW.width + GRID_OVERRUN}
              y2={GRID_AXIS_Y}
            />
          </animated.g>

          <g fill="none">
            {RINGS.map((ring) => (
              <circle
                key={ring.r}
                cx={HUB.x}
                cy={HUB.y}
                r={ring.r}
                stroke={
                  ring.ghost ? "var(--map-grid-ghost)" : "var(--map-grid)"
                }
                strokeWidth={ring.width}
              />
            ))}
          </g>

          {/* The ping: out through the rings and gone, on its own slow clock. */}
          <animated.circle
            cx={HUB.x}
            cy={HUB.y}
            r={ping.to((v) => HUB.r + v * PING_REACH)}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={GRID_STROKE}
            opacity={ping.to((v) => 0.4 * (1 - v) * (1 - v))}
          />

          <g fill="var(--map-mark)">
            {CORNER_MARKS.map(([x, y]) => (
              <rect
                key={`${x}-${y}`}
                x={x}
                y={y}
                width={CORNER_MARK_SIZE}
                height={CORNER_MARK_SIZE}
              />
            ))}
            <circle cx={HUB.x} cy={HUB.y} r={HUB.r} />
          </g>
        </g>

        {/* The circuit at rest, then the same shape filled along the lap.
            Both are cut at the finish, so the flag sits in a gap rather than
            on top of a line that runs under it. */}
        <g mask={`url(#${cutId})`}>
          <path d={TRACK_RIBBON} fill="var(--foreground-on-dark)" />
          <path
            d={TRACK_RIBBON}
            fill="var(--accent)"
            mask={`url(#${maskId})`}
          />
        </g>

        <g id="markers">
          <g fill="var(--accent)">
            {TURNS.map((turn) => (
              <use
                key={`${turn.x}-${turn.y}`}
                href={`#${turnId}`}
                transform={`translate(${turn.x} ${turn.y}) rotate(${turn.angle})`}
              />
            ))}
          </g>
          {/* The flag sits over the circuit, in the gap the cut leaves. */}
          <path d={FLAG_DIAMONDS} fill="var(--map-mark)" />
        </g>
      </svg>
    </div>
  );
};
