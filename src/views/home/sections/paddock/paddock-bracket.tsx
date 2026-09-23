// 📖 Docs: obsidian/frontend/components/sections.md

import { BRACKET, BRACKET_PATH, px } from "./geometry";

export interface PaddockBracketProps {
  /**
   * The **frame** the four corners mark out, in the design's own pixels —
   * not the corner boxes' own coordinates.
   *
   * That distinction is the whole reason this prop is documented. Figma's
   * metadata reports every one of these vectors at its *pre-transform* box,
   * and all four are the same 10x10 shape turned: the left pair and the
   * bottom pair therefore read 10 further right and 10 further down than
   * where they actually land. Reading the numbers straight off the metadata
   * put the left edge of both panels' frames inside the text and hung their
   * bottoms 10 low. Passing the frame and insetting the boxes here is what
   * makes that impossible to get wrong again.
   */
  /**
   * A number is a design pixel, as everywhere else here. A **string** is a
   * CSS length used as it stands — for the two frames that cannot be a fixed
   * coordinate below `lg`: the calendar's, which travels with rounds that
   * have been spread apart, and the stats panel's, which is anchored to the
   * right gutter and widened so its labels stop wrapping.
   */
  x1: number | string;
  x2: number | string;
  y1: number | string;
  y2: number | string;
  colour?: string;
  className?: string;
  /**
   * The length of one design pixel. `px(1)` — a share of the block's width —
   * unless something hands it another, which the two right-hand panels do
   * below `lg`: they are drawn at 1:1 there, the size the hero keeps its own
   * copy of them at, so their frame has to be measured the same way.
   */
  unit?: string;
}

/**
 * `BRACKET_PATH` runs along the top and down the right, so it *is* the
 * top-right corner; the other three are it turned. Figma exports all four as
 * separate files — they are one shape.
 */
const CORNERS = [
  { key: "tl", rotate: 270 },
  { key: "tr", rotate: 0 },
  { key: "br", rotate: 90 },
  { key: "bl", rotate: 180 },
] as const;

/**
 * The corner brackets the design frames its panels with — drawn rather than
 * shipped, so the colour comes from a token and the set can be revealed
 * together.
 *
 * `--bracket-stretch` is the other half of that: it moves the bottom pair
 * alone, so a frame can be made taller rather than shifted, which is what a
 * box holding floored type needs.
 *
 * **They breathe.** Each corner is offset outward by `--bracket-spread`, which
 * is 0 unless something above sets it — so a parent can open the frame on
 * hover without this component knowing what it is framing. Outward is the
 * right direction: a bracket that closes in reads as the panel shrinking,
 * while one that opens reads as the instrument acquiring what it is pointed
 * at, which is the same language the season map's reticle speaks.
 */
export const PaddockBracket = ({
  x1,
  x2,
  y1,
  y2,
  colour = "var(--accent)",
  className,
  unit,
}: PaddockBracketProps) => {
  const one = (value: number) =>
    unit ? `calc(${unit} * ${value})` : px(value);
  const at = (x: number | string) => (typeof x === "number" ? one(x) : x);
  const inset = (v: number | string) =>
    typeof v === "number" ? one(v - BRACKET) : `calc(${v} - ${one(BRACKET)})`;

  return (
  <>
    {CORNERS.map(({ key, rotate }) => (
      <svg
        key={key}
        viewBox="0 0 10.5 10.5"
        aria-hidden
        className={`pointer-events-none absolute ${className ?? ""}`}
        // The left/right and top/bottom corners take the spread with opposite
        // signs, so the set opens about its own centre rather than sliding.
        style={{
          left:
            key === "tl" || key === "bl"
              ? `calc(${at(x1)} - var(--bracket-spread, 0px))`
              : `calc(${inset(x2)} + var(--bracket-spread, 0px))`,
          top:
            key === "tl" || key === "tr"
              ? `calc(${at(y1)} - var(--bracket-spread, 0px) + var(--bracket-drop, 0px))`
              : `calc(${inset(y2)} + var(--bracket-spread, 0px) + var(--bracket-drop, 0px) + var(--bracket-stretch, 0px))`,
          width: one(BRACKET),
          height: one(BRACKET),
          transform: `rotate(${rotate}deg)`,
          transition:
            "left var(--duration-plate) var(--ease-plate), top var(--duration-plate) var(--ease-plate)",
        }}
      >
        <path
          d={BRACKET_PATH}
          fill="none"
          stroke={colour}
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    ))}
    </>
  );
};
