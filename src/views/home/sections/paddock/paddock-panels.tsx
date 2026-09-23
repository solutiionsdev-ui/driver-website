"use client";

// 📖 Docs: obsidian/frontend/components/sections.md

import type { CSSProperties } from "react";
import Image from "next/image";
import TextEngine from "spring-text-engine";

import { Spring } from "@/components/animation/springs/spring";
import type { HomeContent } from "@/data/mocks/home";

import { PaddockBracket } from "./paddock-bracket";
import { FRAME, GUTTER, MEET, PANEL, STATS, px } from "./geometry";

/**
 * One design pixel, for this pair of panels only.
 *
 * `px(1)` — a share of the block's width — until a width says otherwise, and
 * between `sm` and `lg` the section sets it to a real pixel. **That makes the
 * panels 1:1 there, which is the size the hero carries its own copy of them
 * at**: the same two instruments, one screen apart, and scaled with the block
 * this one came out at half — 20 figures against the hero's 38, labels
 * wrapping in a column built for type a third the size. Every length below
 * goes through it, so the panel scales as one object and its bracket with it.
 */
// `100cqw / 1440` rather than `px(1)`: the same length, but exact. `px()`
// rounds to four decimals, which is nothing on one pixel and a whole one
// across the 193 of the column — enough to move the panel at 1024 and 1280.
const U = `var(--panel-u, calc(100cqw / ${FRAME.width}))`;
const u = (value: number) => `calc(${U} * ${value})`;

/**
 * Both panels' text column: **anchored to the right gutter**, not to the
 * frame's own x — the only form that can be resized. It reads the same at
 * 1440, where the design puts the column's right edge 44 from the block's
 * edge, and at 768 it keeps the panel on the block's own gutter while the
 * column itself grows leftward into the block rather than off the screen.
 */
const columnWidth = u(MEET.width);
/**
 * The stats block's own width, which is the column's until a screen says
 * otherwise. Between `sm` and `lg` it opens to hold **two columns of two**:
 * the block runs the full height of the screen there while the frame's is
 * 800, and a single column of four at the hero's own type ran down half of
 * it, straight over the figure's head. Two by two closes it to 133 and hands
 * that height back to the figure, without touching a single size in it.
 */
const statsWidth = `var(--stats-col-w, ${columnWidth})`;
// The frame's own numbers are 1190 to 1408 around a 193 column at 1203 — an
// inset of 13 on one side and 12 on the other, hence the `- 1`.
const columnRight = `calc(${px(GUTTER)} + ${u(PANEL.inset - 1)})`;
const columnLeft = `calc(100% - ${columnRight} - ${columnWidth})`;
const statsRight = `calc(${columnRight} + var(--stats-right-inset, 0px))`;
// Anchored from the right until a width says otherwise. Between `sm` and `lg`
// the two panels trade places — the stats run down the left under the
// masthead, the meeting takes the corner — so both edges arrive as variables.
const statsLeft = `var(--stats-left, calc(100% - ${statsRight} - ${statsWidth}))`;
/** The frame the brackets mark, in the same terms. */
const FRAME_RIGHT = `calc(100% - ${px(GUTTER)})`;
const FRAME_LEFT = `calc(${FRAME_RIGHT} - ${columnWidth} - ${u(
  PANEL.inset * 2 - 1,
)})`;
const STATS_FRAME_RIGHT = `var(--stats-frame-right, calc(${FRAME_RIGHT} - var(--stats-right-inset, 0px)))`;
const STATS_FRAME_LEFT = `var(--stats-frame-left, calc(${STATS_FRAME_RIGHT} - ${statsWidth} - ${u(
  PANEL.inset * 2 - 1,
)}))`;

export interface PaddockPanelsProps {
  meet: HomeContent["paddock"]["meet"];
  stats: HomeContent["paddock"]["stats"];
}

const REVEAL_CONFIG = { tension: 90, friction: 26 };
const FIGURE_CONFIG = { tension: 200, friction: 24 };
const RISE_FROM = { opacity: 0, transform: "translateY(0.5rem)" };
const RISE_TO = { opacity: 1, transform: "translateY(0rem)" };
const FADE_FROM = { opacity: 0 };
const FADE_TO = { opacity: 1 };
const LETTER_OUT = { opacity: 0, y: "0.3em" };
const LETTER_IN = { opacity: 1, y: "0em" };

/** The brackets arrive first, then what they frame. */
const MEET_DELAY = 320;
const STATS_DELAY = 460;
const ROW_STAGGER = 90;

/**
 * The two panels down the right: the meeting, and the numbers it produced.
 *
 * Both are framed by corner brackets rather than a border — the design never
 * closes the box, it marks its corners, which is why `PaddockBracket` draws one
 * path four ways instead of shipping Figma's four files.
 *
 * The figures resolve letter by letter, a beat apart down the column, the way
 * the season plate's stats do. Everything is `mode="forward"`: it plays on the
 * way down and holds on the way back up.
 */
/**
 * **Neither panel is drawn on a phone.** At 390 the block is a stack and the
 * two instruments took the whole upper half of it, which left the figure
 * hanging between them and the report. Both belong to a screen with room
 * beside the figure; the phone keeps the masthead, the report and Kimi.
 */
export const PaddockPanels = ({ meet, stats }: PaddockPanelsProps) => (
  <>
    <Spring
      tag="div"
      mode="forward"
      enabled
      config={REVEAL_CONFIG}
      delayIn={MEET_DELAY}
      from={FADE_FROM}
      to={FADE_TO}
      // Full-bleed and invisible: without `pointer-events-none` this
      // wrapper swallowed every hover in the block, the call to action
      // included.
      className="pointer-events-none absolute inset-0 z-20 max-sm:hidden [--bracket-drop:var(--meet-drop,0px)]"
    >
      {/* Black, not the accent. Figma strokes both of these panels' brackets
          `#090A0B` — they sit on the block's light surface, where the accent
          is spent on the button and the live round instead. Only the
          calendar's brackets, down on the dark band, are cyan. */}
      <PaddockBracket
        x1={`var(--meet-frame-left, ${FRAME_LEFT})`}
        x2={`var(--meet-frame-right, ${FRAME_RIGHT})`}
        y1={`var(--meet-frame-top, ${u(MEET.y)})`}
        y2={`var(--meet-frame-bottom, ${u(MEET.y + MEET.height)})`}
        colour="var(--foreground)"
        unit={U}
      />
    </Spring>

    <Spring
      tag="div"
      mode="forward"
      enabled
      config={REVEAL_CONFIG}
      delayIn={MEET_DELAY + 90}
      from={RISE_FROM}
      to={RISE_TO}
      className="absolute z-20 flex flex-col uppercase leading-flat text-foreground max-sm:hidden"
      style={{
        left: `var(--meet-left, ${columnLeft})`,
        top: `var(--meet-top, calc(${u(MEET.textY)} + var(--meet-drop, 0px)))`,
        // Anchored from the foot instead, where a width sets it: below `lg`
        // the panel joins the copy at the bottom of the block rather than
        // standing on its own under the masthead, and what it has to keep is
        // its distance from the copy — which is measured off the same band
        // the copy is measured off.
        bottom: `var(--meet-bottom, auto)`,
        width: columnWidth,
        gap: u(6),
        fontSize: u(14),
      }}
    >
      <p className="font-bold">{meet.name}</p>
      <p>{meet.circuit}</p>
      <p>{meet.date}</p>
    </Spring>

    <Spring
      tag="div"
      mode="forward"
      enabled
      config={REVEAL_CONFIG}
      delayIn={STATS_DELAY}
      from={FADE_FROM}
      to={FADE_TO}
      // Full-bleed and invisible: without `pointer-events-none` this
      // wrapper swallowed every hover in the block, the call to action
      // included.
      // The frame follows the column it marks: closing the rules took 95 out
      // of the content, and `--bracket-stretch` takes the same 95 off the
      // frame's bottom pair so the two still close on 10 all round. In the
      // panel's own unit, so it holds across the whole narrow band.
      className="pointer-events-none absolute inset-0 z-20 max-sm:hidden [--bracket-drop:calc(var(--stats-drop,0px)+var(--stats-frame-drop,0px))] sm:max-lg:[--bracket-stretch:calc(var(--panel-u)*-62)] max-sm:[--bracket-stretch:calc(var(--panel-u)*-245)]"
    >
      <PaddockBracket
        x1={STATS_FRAME_LEFT}
        x2={STATS_FRAME_RIGHT}
        y1={STATS.y}
        y2={STATS.y + STATS.height}
        colour="var(--foreground)"
        unit={U}
      />
    </Spring>

    <div
      // Two by two on the phone, one column everywhere else: four rows of the
      // hero's own figures run 316 down a screen that has 844 to spend on the
      // whole block.
      className="absolute z-20 max-sm:hidden"
      style={
        {
          left: statsLeft,
          // The drop is 0 unless the section sets it. It has to on the phone:
          // the meet panel's 73 is three lines of unfloored 14, and once the
          // floor lifts those lines the block grows past its own box and into
          // "last result" — measured at 768, by 15px.
          top: `calc(${u(STATS.textY)} + var(--stats-drop, 0px))`,
          width: statsWidth,
        } as CSSProperties
      }
    >
      {stats.map((stat, index) => (
        <div key={stat.label}>
          {index > 0 ? (
            // The rules between rows draw themselves in from the left.
            <Spring
              tag="div"
              mode="forward"
              enabled
              config={REVEAL_CONFIG}
              delayIn={STATS_DELAY + index * ROW_STAGGER}
              from={{ opacity: 0, transform: "scaleX(0)" }}
              to={{ opacity: 1, transform: "scaleX(1)" }}
              // 24 above and 23 below, not 24 and 24: the design's rule is a
              // zero-height line at 82 with the next row at 106, and a real
              // 1px rule has to give that pixel back or the column drifts —
              // it was 7 low by the fourth row.
              // The rules take a narrower margin where the rows have been
              // floored — through a variable, since both are inline.
              // On the phone's grid the rules belong to the second row, so
              // the one above the top-right cell is dropped there.
              className={`w-full origin-left bg-foreground-muted${
                index === 1 ? " max-sm:hidden" : ""
              }`}
              style={{
                height: 1,
                marginTop: `var(--stats-rule-top, ${u(24)})`,
                marginBottom: `var(--stats-rule-bottom, ${u(23)})`,
              }}
            />
          ) : null}

          <Spring
            tag="div"
            mode="forward"
            enabled
            config={REVEAL_CONFIG}
            delayIn={STATS_DELAY + index * ROW_STAGGER + 40}
            from={RISE_FROM}
            to={RISE_TO}
            // The row's 58 is measured against unfloored type; floored it
            // needs 38 in a 31 box and spilled onto the divider under it.
            className="flex items-end"
            style={{
              gap: u(24),
              // The row's 58 is measured against unfloored type; floored it
              // needs 38 in a 31 box and spilled onto the divider under it.
              // `max()`, not a class — the height is inline and inline wins.
              height: `max(${u(STATS.row)}, var(--stats-row-min, 0px))`,
            }}
          >
            <Image
              src={stat.icon}
              alt=""
              width={STATS.icon}
              height={STATS.icon}
              // The figure beside it is set on a cap-height line, so its
              // baseline falls a little below the box it is laid out in —
              // measured, a baseline of 76.1 against a box ending at 74. The icon's box ends with
              // that box, so it hung above the type's own foot; the nudge
              // lands it on the baseline. Narrow widths only — the frame's
              // own alignment stands from `lg` up.
              className="block shrink-0 self-end sm:max-lg:translate-y-[2px]"
              style={{ width: u(STATS.icon), height: u(STATS.icon) }}
            />
            <span className="flex flex-1 flex-col" style={{ gap: u(12) }}>
              <span
                className="uppercase text-foreground-muted"
                style={{ fontSize: u(12), letterSpacing: u(-0.48) }}
              >
                {stat.label}
              </span>
              <span
                className="font-display font-medium leading-cap text-foreground"
                style={{ fontSize: u(38), letterSpacing: u(-3.04) }}
              >
                <TextEngine
                  tag="span"
                  mode="forward"
                  enabled
                  delayIn={STATS_DELAY + index * ROW_STAGGER + 120}
                  letterStagger={24}
                  letterOut={LETTER_OUT}
                  letterIn={LETTER_IN}
                  letterConfig={FIGURE_CONFIG}
                  className="justify-start"
                >
                  {stat.value}
                </TextEngine>
              </span>
            </span>
          </Spring>
        </div>
      ))}
    </div>
  </>
);
