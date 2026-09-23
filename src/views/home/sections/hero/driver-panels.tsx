import TextEngine from "spring-text-engine";

import Image from "next/image";

import type { HomeContent } from "@/data/mocks/home";

import { BracketPanel } from "./bracket-panel";

// Module constants, not JSX literals: the engine hands these to `useSpring`,
// and a fresh object per render re-seeds the animation mid-flight.
const FIGURE_OUT = { opacity: 0, y: "0.3em" };
const FIGURE_IN = { opacity: 1, y: "0em" };
const FIGURE_CONFIG = { tension: 200, friction: 24 };
const FIGURE_STAGGER = 90;

export interface DriverPanelsProps {
  nextRace: HomeContent["hero"]["nextRace"];
  season: HomeContent["hero"]["season"];
  className?: string;
}

const EYEBROW =
  "text-eyebrow font-medium uppercase leading-flat tracking-eyebrow text-accent";

/**
 * The right rail — next race and season stats. Two bracket panels stacked at
 * desktop (Figma 944:188); side by side on tablets, stacked again on phones.
 */
export const DriverPanels = ({
  nextRace,
  season,
  className,
}: DriverPanelsProps) => (
  <div
    // Marked so the 1441-1920 type base can widen the column with its type —
    // the box is rem and its contents are type, so a bigger scale alone broke
    // "spa-francorchamps" and "118" onto second lines. See `globals.css`.
    data-hero-panels
    className={`flex flex-col items-stretch gap-8 sm:flex-row sm:flex-wrap sm:items-start sm:gap-8 md:w-[13.625rem] md:flex-col md:items-stretch ${className ?? ""}`}
  >
    <BracketPanel>
      <h2 className={EYEBROW}>{nextRace.eyebrow}</h2>
      {/* Below `xl` the panel is far wider than the copy, so the circuit sits
          beside it rather than under it: the panel stays one text-block tall
          and the empty half of the frame is spent. From `md` the rails are a
          13.625rem column again, so the design's stacking returns. */}
      <div className="mt-4 flex items-center justify-between gap-4 sm:items-start sm:justify-start sm:gap-8 md:mt-0 md:block">
        <dl className="flex flex-col gap-[0.375rem] text-body uppercase leading-flat text-foreground md:mt-4">
          <dt className="font-bold">{nextRace.name}</dt>
          <dd>{nextRace.circuit}</dd>
          <dd>
            <time dateTime="2026-07-27">{nextRace.date}</time>
          </dd>
        </dl>
        <Image
          src={nextRace.map}
          alt={nextRace.mapAlt}
          width={78}
          height={50}
          data-hero-map
          className="h-[4.375rem] w-[6.25rem] shrink-0 object-contain object-right sm:h-[3.125rem] sm:w-[4.875rem] sm:object-left md:mt-7"
        />
      </div>
    </BracketPanel>

    <BracketPanel>
      <h2 className={EYEBROW}>{season.eyebrow}</h2>
      <dl
        // Marked so the 1441-1920 type base can widen it by the same factor —
        // the figures are set in rem and this box is not, so a bigger type
        // alone broke "118" onto two lines. See `globals.css`.
        data-hero-stats
        className="mt-6 grid w-full grid-cols-3 items-start gap-4 text-foreground sm:flex sm:w-[10.75rem] sm:justify-between"
      >
        {season.stats.map((stat, index) => (
          <div key={stat.label} className="flex flex-col items-start gap-3 sm:items-center">
            <dt className="whitespace-nowrap text-eyebrow uppercase tracking-label">
              {stat.label}
            </dt>
            <dd className="font-display text-heading font-medium leading-cap tracking-stat">
              {/* The figures resolve digit by digit, the way the season
                  plate's and the paddock panel's do — the page's numbers all
                  arrive the same way. `mode="forward"`: it plays on the way
                  down and holds on the way back up. */}
              <TextEngine
                tag="span"
                mode="forward"
                enabled
                delayIn={index * FIGURE_STAGGER}
                letterStagger={26}
                letterOut={FIGURE_OUT}
                letterIn={FIGURE_IN}
                letterConfig={FIGURE_CONFIG}
                className="justify-start sm:justify-center"
              >
                {stat.value}
              </TextEngine>
            </dd>
          </div>
        ))}
      </dl>
    </BracketPanel>
  </div>
);
