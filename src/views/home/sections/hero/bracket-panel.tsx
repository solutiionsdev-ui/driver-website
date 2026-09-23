/**
 * The hero's side-rail panel: no border, no fill — just four corner brackets
 * (Figma 944:149/150/152/153). One 10×10 stroke drawn four times; the shape is
 * a top-and-right corner, so the other three are mirrors of it.
 */

/** Exported vector from Figma — the `Vector 10` / `Vector 12` path. */
const BRACKET_PATH = "M0 0.5H10V10.5";

const CORNERS = [
  { key: "top-left", position: "left-0 top-0", flip: "-scale-x-100" },
  { key: "top-right", position: "right-0 top-0", flip: "" },
  { key: "bottom-left", position: "bottom-0 left-0", flip: "-scale-100" },
  { key: "bottom-right", position: "bottom-0 right-0", flip: "-scale-y-100" },
] as const;

export interface BracketPanelProps {
  children: React.ReactNode;
  className?: string;
}

export const BracketPanel = ({ children, className }: BracketPanelProps) => (
  <div
    className={`relative p-4 sm:px-[1.375rem] sm:pb-[1.1875rem] sm:pt-4 ${className ?? ""}`}
  >
    {CORNERS.map(({ key, position, flip }) => (
      <svg
        key={key}
        viewBox="0 0 10.5 10.5"
        fill="none"
        aria-hidden
        className={`pointer-events-none absolute size-[0.625rem] text-foreground ${position} ${flip}`}
      >
        <path d={BRACKET_PATH} stroke="currentColor" />
      </svg>
    ))}
    {children}
  </div>
);
