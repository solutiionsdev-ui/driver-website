"use client";

// 📖 Docs: obsidian/frontend/components/sections.md

import type { CSSProperties } from "react";
import { animated, easings, useInView, useSpring } from "@react-spring/web";

import { Spring } from "@/components/animation/springs/spring";
import type { HomeContent } from "@/data/mocks/home";

import { PaddockBracket } from "./paddock-bracket";
import { BAND, CALENDAR, px, type } from "./geometry";

export interface PaddockCalendarProps {
  rounds: HomeContent["paddock"]["calendar"];
}

const REVEAL_CONFIG = { tension: 90, friction: 26 };
const NAME_CONFIG = { tension: 190, friction: 24 };
const RISE_FROM = { opacity: 0, transform: "translateY(0.5rem)" };
const RISE_TO = { opacity: 1, transform: "translateY(0rem)" };
const FADE_FROM = { opacity: 0 };
const FADE_TO = { opacity: 1 };
const NAME_OUT = { opacity: 0, transform: "translateY(0.3em)" };
const NAME_IN = { opacity: 1, transform: "translateY(0em)" };

const CARD_DELAY = 560;
const CARD_STAGGER = 90;

/**
 * The live round's own pulse: a ring leaving the marker, on the same slow clock
 * the season map's hub ping runs on so the two read as one instrument.
 */
/** The frame's own middle: every x below is spread about it. */
const MID_X = 720;

/**
 * One of the strip's own x, measured from the middle of the block and pushed
 * out by `--cal-spread`. Identity at 1, which is the frame's own coordinate.
 */
const spread = (x: number) =>
  `calc(50% + ${px(x - MID_X)} * var(--cal-spread, 1))`;

const PULSE_MS = 3200;
const PULSE_REACH = 3.4;

/**
 * One crawl of the connectors' dash, in ms. They travel **toward** the round
 * being reported on — the two runs to its left move right, the two to its
 * right move left — so the strip reads as the season closing on the current
 * race rather than as a decoration ticking over.
 */
const CRAWL_MS = 5200;

/**
 * How far the live round's brackets open when it is pointed at, in design px.
 * Small on purpose — the frame should acknowledge the cursor, not jump.
 */
const BRACKET_SPREAD = 5;

/**
 * The season's run along the bottom of the block.
 *
 * The cards are not on a grid — the design sets each one's own x and width, so
 * those travel with the content rather than being derived, and the connectors
 * between them are the design's own four runs at their own coordinates. The
 * round being reported on is the only one in the accent, and the only one the
 * corner brackets frame.
 *
 * Each card arrives a beat after the one to its left, and its name resolves
 * letter by letter — the same treatment the timeline gives its years, so the
 * two dark strips read as the same instrument.
 */
/**
 * One connector's dashes, crawling. The direction is handed in so the runs
 * either side of the live round travel toward it.
 */
const Connector = ({ toward }: { toward: 1 | -1 }) => {
  const period = CALENDAR.linkDash + CALENDAR.linkGap;
  const [{ crawl }] = useSpring(() => ({
    from: { crawl: 0 },
    to: { crawl: toward * period },
    loop: true,
    config: { duration: CRAWL_MS, easing: easings.linear },
  }));

  return (
    <animated.div
      className="size-full"
      style={{
        backgroundImage: `repeating-linear-gradient(to right, var(--foreground-on-dark-muted) 0 ${px(CALENDAR.linkDash)}, transparent ${px(CALENDAR.linkDash)} ${px(period)})`,
        backgroundPositionX: crawl.to((value) => px(value)),
      }}
    />
  );
};

/**
 * A ring leaving the live round's marker, once every 3.2s, fading on a square
 * law so it is gone before it reaches its neighbours. Paused out of view.
 */
const LiveMarker = ({ rounds }: PaddockCalendarProps) => {
  const live = rounds.find((round) => round.live);
  const [{ pulse }] = useSpring(() => ({
    from: { pulse: 0 },
    to: { pulse: 1 },
    loop: true,
    config: { duration: PULSE_MS, easing: easings.easeOutQuad },
  }));
  if (!live) return null;

  return (
    <svg
      viewBox="0 0 11 11"
      aria-hidden
      className="pointer-events-none absolute overflow-visible max-sm:hidden"
      style={{
        left: `calc(50% + ${px(live.x + live.width / 2 - MID_X)} * var(--cal-spread, 1))`,
        top: `calc(${px(CALENDAR.markY)} + var(--cal-mark-drop, 0px))`,
        width: px(CALENDAR.dot),
        height: px(CALENDAR.dot),
        transform: "translateX(-50%)",
      }}
    >
      <animated.circle
        cx={5.5}
        cy={5.5}
        r={pulse.to((value) => 5.5 + value * 5.5 * PULSE_REACH)}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
        opacity={pulse.to((value) => 0.5 * (1 - value) * (1 - value))}
      />
    </svg>
  );
};

export const PaddockCalendar = ({ rounds }: PaddockCalendarProps) => {
  /**
   * The strip runs its entrance when it **arrives**, not when it mounts.
   *
   * Every `Spring` below was already staggered, but `enabled` is a plain
   * boolean and the page mounts all six blocks at once — so the whole
   * choreography played through at load, some three screens above where
   * anyone could see it, and scrolling down met a strip that had already
   * finished. Gating `enabled` holds each one at its `from` until then;
   * `mode="forward"` keeps them put on the way back up.
   *
   * The margin is what makes it read: fired the instant the first pixel
   * crosses the fold, the cards animate while still under the edge of the
   * screen. A fifth of the viewport in, the strip is properly in frame.
   */
  const [viewRef, inView] = useInView({
    once: true,
    rootMargin: "0% 0% -20% 0%",
  });

  return (
    // The strip is the band: everything inside is measured from its top, so the
    // calendar travels with the foot of the block rather than with the frame's
    // own 800.
    <div
      ref={viewRef}
      // `has-[...]` is what lets the live round's card open a bracket set that
      // is not its child: the brackets are drawn in their own absolute layer
      // over the whole strip, so the two are siblings and the spread has to
      // travel down from the parent they share.
      // `has-[...]` is what lets the live round's card open a bracket set that
      // is not its child: the brackets are drawn in their own absolute layer
      // over the whole strip, so the two are siblings and the spread has to
      // travel down from the parent they share.
      // Five across does not fit on the frame's own x below `lg` — 87 of
      // pitch at 768 against names set at the site's narrow 17 — so between
      // `sm` and `lg` every x here is **spread about the block's middle** by
      // `--cal-spread`, the markers and their connectors drop by
      // `--cal-mark-drop`, and the band grows to hold them. Positions only:
      // the type is the same floors the rest of the page uses. Scaling the
      // whole strip instead did the geometry in one line and got the type
      // wrong — it multiplied that too, and the round labels came out at 11
      // where everything else on the site is 13.
      // Under `sm` there is no width to spread into and the cards still wrap
      // three to a row on a grid, which puts every label on one line with its
      // neighbours'.
      // And a second rule above the cards, so the strip reads as its own row
      // inside that panel rather than as more of the report.
      className="group/cal absolute inset-x-0 bottom-0 z-20 h-[calc(var(--band)*var(--band-scale,1))] max-sm:h-auto max-sm:border-t max-sm:border-foreground-on-dark/15 max-sm:grid max-sm:h-auto max-sm:grid-cols-3 max-sm:items-start max-sm:gap-x-3 max-sm:gap-y-5 max-sm:px-[4%] max-sm:py-6 has-[[data-live-round]:hover]:[--bracket-spread:var(--calendar-spread)]"
      style={
        {
          "--band": px(BAND.height),
          "--calendar-spread": px(BRACKET_SPREAD),
        } as CSSProperties
      }
    >
      {/* The connectors, drawn before the cards so the markers sit on them. */}
      {CALENDAR.links.map((link, index) => (
        <Spring
          key={link.x}
          tag="div"
          mode="forward"
          enabled={inView}
          config={REVEAL_CONFIG}
          delayIn={CARD_DELAY + index * CARD_STAGGER}
          from={{ opacity: 0, transform: "scaleX(0)" }}
          to={{ opacity: 1, transform: "scaleX(1)" }}
          className="absolute origin-left max-sm:hidden"
          style={{
            // Measured from the block's middle so `--cal-spread` can push it
            // outward; identity at 1, which is the frame's own x.
            left: `calc(50% + ${px(link.x + link.width / 2 - MID_X)} * var(--cal-spread, 1) - ${px(link.width / 2)} * var(--cal-spread, 1))`,
            top: `calc(${px(CALENDAR.linkY)} + var(--cal-mark-drop, 0px))`,
            width: `calc(${px(link.width)} * var(--cal-spread, 1))`,
            height: 1,
          }}
        >
          <Connector toward={index < CALENDAR.links.length / 2 ? 1 : -1} />
        </Spring>
      ))}

      {rounds.map((round, index) => (
        <Spring
          key={round.round}
          tag="div"
          mode="forward"
          enabled={inView}
          config={REVEAL_CONFIG}
          delayIn={CARD_DELAY + index * CARD_STAGGER}
          from={RISE_FROM}
          to={RISE_TO}
          {...(round.live ? { "data-live-round": "" } : {})}
          // **The phone shows three rounds, not five** — the live one and the
          // two still to come. Five across a 390 grid ran to two rows of
          // cards for a strip that is meant to read at a glance, and the two
          // already raced are the ones the block says least about.
          className={`absolute flex flex-col items-center text-center uppercase max-sm:static max-sm:w-auto ${
            index < rounds.length - 3 ? "max-sm:hidden" : ""
          } ${round.live ? "pointer-events-auto" : ""}`}
          style={{
            left: `calc(50% + ${px(round.x + round.width / 2 - MID_X)} * var(--cal-spread, 1) - ${px(round.width / 2)})`,
            top: `calc(${px(CALENDAR.y)} + var(--cal-card-drop, 0px))`,
            // The frame's own 100 until a width says otherwise. On the phone
            // the cards are grid cells and their type is centred on the card,
            // not on the cell — at 26 real pixels the first column's name hung
            // 18 off the left edge of the block.
            width: `var(--cal-card-w, ${px(round.width)})`,
            gap: type(12),
          }}
        >
          <span
            className="flex w-full flex-col items-center"
            style={{ gap: type(6) }}
          >
            <span
              // `whitespace-nowrap`, like the name above it: the card is the
              // frame's 100 — 53 real pixels at 768 — and a floored 13 broke
              // "round 11" over two lines, which pushed every card to a
              // different depth and the dates onto the marker run.
              // `w-auto` below `lg`: the line is wider than the card there —
              // 94 against 53 — and an overflowing `w-full` line spills to
              // the **right** only, so the whole row sat 18 off centre and
              // the block's right margin came out a third of its left.
              // Auto-width lines are centred by the column's `items-center`,
              // which puts the ink back on the card's own middle. `w-full`
              // stands from `lg` up, where the frame's cards are wide enough
              // for it and nothing moves.
              className={`w-full max-lg:w-auto whitespace-nowrap leading-flat ${round.live ? "text-accent" : "text-foreground-on-dark-muted"}`}
              style={{ fontSize: type(12), letterSpacing: px(-0.24) }}
            >
              {round.round}
            </span>
            {/* The design lets the name overrun its card and stay on one line —
              several are wider than the 100 they are given. `flex-nowrap` is
              what holds it: the engine lays letters out as flex items, and
              without it "hungarian gp" broke across two lines and pushed its
              marker off the connector run. */}
            {/* A rise rather than a letter reveal, and the layout decides it:
              several names are wider than the 100 their card is given and the
              design lets them overrun on one line, but the text engine lays
              words out as flex items and sets its own wrap *inline*, so no
              class can stop "hungarian gp" breaking in two. The letter
              treatment stays where the boxes are wide enough for it — the
              stats figures, and the timeline's years. */}
            <Spring
              tag="span"
              mode="forward"
              enabled={inView}
              config={NAME_CONFIG}
              delayIn={CARD_DELAY + index * CARD_STAGGER + 110}
              from={NAME_OUT}
              to={NAME_IN}
              className="block w-full max-lg:w-auto whitespace-nowrap font-display font-bold leading-headline text-foreground-on-dark"
              // The strip's one line of real type, on the same floor the
              // block's own intro and the two blocks above it carry.
              style={{ fontSize: `max(${type(18)}, var(--copy-min-size, 0px))` }}
            >
              {round.name}
            </Spring>
          </span>
          <span
            className={`w-full max-lg:w-auto whitespace-nowrap leading-flat ${round.live ? "text-accent" : "text-foreground-on-dark-muted"}`}
            style={{ fontSize: type(14), letterSpacing: px(-0.28) }}
          >
            {round.date}
          </span>
        </Spring>
      ))}

      {/* The markers sit on the connector run at a fixed height, not at the foot
        of a card — the cards are different heights and the run is one line. */}
      {rounds.map((round, index) => (
        <Spring
          key={`${round.round}-mark`}
          tag="div"
          mode="forward"
          enabled={inView}
          config={REVEAL_CONFIG}
          delayIn={CARD_DELAY + index * CARD_STAGGER + 60}
          from={FADE_FROM}
          to={FADE_TO}
          className="absolute flex justify-center max-sm:hidden"
          style={{
            left: `calc(50% + ${px(round.x + round.width / 2 - MID_X)} * var(--cal-spread, 1) - ${px(round.width / 2)})`,
            top: `calc(${px(CALENDAR.markY)} + var(--cal-mark-drop, 0px))`,
            width: px(round.width),
          }}
        >
          {round.result ? (
            <span
              className="font-display font-bold uppercase leading-headline text-foreground-on-dark"
              style={{ fontSize: type(12) }}
            >
              {round.result}
            </span>
          ) : (
            // Rounds still to come carry a ring; the live one is filled.
            <svg
              viewBox="0 0 11 11"
              aria-hidden
              className="block"
              style={{ width: px(CALENDAR.dot), height: px(CALENDAR.dot) }}
            >
              {round.live ? (
                <circle cx={5.5} cy={5.5} r={5.5} fill="var(--accent)" />
              ) : (
                <circle
                  cx={5.5}
                  cy={5.5}
                  r={5}
                  fill="none"
                  stroke="var(--foreground-on-dark)"
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                />
              )}
            </svg>
          )}
        </Spring>
      ))}

      {/* The live round pulses — the only thing on this strip that is still to
        come, and the only one that moves on its own. */}
      <LiveMarker rounds={rounds} />

      {/* Only the live round is framed. */}
      <Spring
        tag="div"
        mode="forward"
        enabled={inView}
        config={REVEAL_CONFIG}
        delayIn={CARD_DELAY + rounds.length * CARD_STAGGER}
        from={FADE_FROM}
        to={FADE_TO}
        // The frame's own 32 to 113 wraps a 58-tall card. At the site's
        // narrow sizes the card is 65 and sits 10 lower, so the same
        // coordinates cut it off under the round number — see the drop and
        // the stretch, which put the frame back around the whole card:
        // label, name and date, the way 1440 has it.
        className="pointer-events-none absolute inset-0 max-sm:hidden sm:max-lg:[--bracket-drop:1.7cqw] sm:max-lg:[--bracket-stretch:5.9cqw]"
      >
        <PaddockBracket
          x1={spread(CALENDAR.live.left)}
          x2={spread(CALENDAR.live.right)}
          y1={CALENDAR.live.top}
          y2={CALENDAR.live.bottom}
        />
      </Spring>
    </div>
  );
};
