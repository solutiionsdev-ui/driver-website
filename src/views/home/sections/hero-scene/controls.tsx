"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import {
  HALFTONE_DEFAULTS,
  useHalftone,
  type HalftoneParams,
  type HalftoneSource,
} from "@/views/home/sections/season/halftone-store";

import { DEFAULT_PARAMS, HeroSceneParams } from "./scene";

export interface SceneControlsProps {
  params: HeroSceneParams;
  onChange: (partial: Partial<HeroSceneParams>) => void;
}

interface SliderDef {
  key: keyof HeroSceneParams;
  label: string;
  min: number;
  max: number;
  step: number;
}

const GROUPS: { title: string; sliders: SliderDef[] }[] = [
  {
    title: "Helmet",
    sliders: [
      { key: "helmetScale", label: "scale", min: 0.5, max: 1.6, step: 0.01 },
      { key: "helmetY", label: "y", min: -1.5, max: 1.5, step: 0.01 },
      { key: "helmetX", label: "x", min: -1.5, max: 1.5, step: 0.01 },
      { key: "helmetZ", label: "z", min: -1, max: 1.5, step: 0.01 },
      // Symmetric about zero. Every one of these is a plain multiplier on the
      // smoothed pointer offset, so the sign is a direction, not a magnitude:
      // negative makes the helmet lean and drift *against* the cursor instead
      // of with it. The floor at 0 was hiding half the range each one has.
      // `scale` and `brightness` stay positive — a negative scale mirrors the
      // mesh and flips its winding against the FrontSide shell, and a negative
      // colour multiplier just clamps to black.
      { key: "helmetFollow", label: "follow", min: -0.3, max: 0.3, step: 0.005 },
      // The cursor rotation, one pair per axis: the **amplitude** is the
      // angle in degrees the helmet reaches with the cursor at the window's
      // edge, the **curve** is the shape on the way there (0 linear, higher
      // saturates earlier — steep through the middle, eased at the ends). The
      // amplitude is signed, and symmetric: the sign is a direction, and an
      // off-centre zero on a signed control is a worse instrument than a wide
      // one. 30° each way is far past anything that reads as a worn helmet,
      // which is the point of a tuning rig. See `swing` in scene.ts.
      { key: "helmetAmpX", label: "rot x amp °", min: -30, max: 30, step: 0.1 },
      { key: "helmetCurveX", label: "rot x curve", min: 0, max: 12, step: 0.05 },
      { key: "helmetAmpY", label: "rot y amp °", min: -30, max: 30, step: 0.1 },
      { key: "helmetCurveY", label: "rot y curve", min: 0, max: 12, step: 0.05 },
      {
        key: "helmetBrightness",
        label: "brightness",
        min: 0.2,
        max: 3,
        step: 0.01,
      },
    ],
  },
  {
    title: "Head",
    sliders: [
      { key: "headScale", label: "scale", min: 0.6, max: 1.5, step: 0.01 },
      { key: "headY", label: "y", min: -1.5, max: 1.5, step: 0.01 },
      // Also a pointer multiplier — negative pushes the portrait's UVs the
      // other way against its depth map, so the face reads concave.
      { key: "headParallax", label: "depth", min: -0.2, max: 0.2, step: 0.005 },
      { key: "headRelight", label: "relight", min: 0, max: 1.2, step: 0.01 },
    ],
  },
  {
    title: "Reveal — shape",
    sliders: [
      { key: "trailRadius", label: "brush", min: 0.05, max: 1.2, step: 0.01 },
      { key: "trailIdleScale", label: "brush idle", min: 0.1, max: 1, step: 0.01 },
      { key: "trailTaper", label: "taper", min: 0.2, max: 5, step: 0.05 },
      { key: "trailTaperIdle", label: "taper idle", min: 0.5, max: 6, step: 0.05 },
      { key: "trailTaperFast", label: "taper fast", min: 0.1, max: 3, step: 0.05 },
      // 1.0 is the whole history — TRAIL_SAMPLES frames of it. Raising the
      // ceiling further does nothing; lengthen the buffer instead.
      { key: "trailLength", label: "length", min: 0.02, max: 1, step: 0.01 },
      {
        key: "revealThreshold",
        label: "threshold",
        min: 0.05,
        max: 0.95,
        step: 0.01,
      },
      { key: "revealEdge", label: "edge", min: 0.005, max: 0.4, step: 0.005 },
      { key: "revealWarp", label: "warp", min: 0, max: 2, step: 0.01 },
      { key: "revealWarpScale", label: "warp scale", min: 0.2, max: 6, step: 0.05 },
      { key: "revealSpeed", label: "warp speed", min: 0, max: 4, step: 0.05 },
      { key: "pointerLerp", label: "follow", min: 0.01, max: 0.5, step: 0.005 },
    ],
  },
  {
    title: "Reveal — speed response",
    sliders: [
      { key: "pacePeak", label: "full speed", min: 0.005, max: 0.15, step: 0.001 },
      { key: "paceThreshold", label: "gate", min: 0, max: 0.6, step: 0.005 },
      { key: "paceRamp", label: "gate ramp", min: 0.01, max: 0.8, step: 0.005 },
      { key: "paceAttack", label: "attack", min: 0.02, max: 1, step: 0.01 },
      { key: "paceRelease", label: "release", min: 0.005, max: 0.5, step: 0.005 },
    ],
  },
  {
    title: "Outline scan",
    sliders: [
      { key: "outlinePeriod", label: "travel s", min: 0.5, max: 8, step: 0.1 },
      { key: "outlineStagger", label: "every s", min: 0.1, max: 8, step: 0.05 },
      { key: "outlineOpacity", label: "peak", min: 0, max: 1, step: 0.01 },
      { key: "outlineWidth", label: "width", min: 0.02, max: 0.6, step: 0.01 },
      { key: "outlineBase", label: "idle", min: 0, max: 0.5, step: 0.005 },
      {
        key: "outlineLightness",
        label: "lightness",
        min: 0,
        max: 1,
        step: 0.01,
      },
    ],
  },
  {
    title: "Backdrop",
    sliders: [
      { key: "bgLineScale", label: "scale", min: 0.2, max: 6, step: 0.05 },
      { key: "bgLineCount", label: "density", min: 1, max: 40, step: 0.5 },
      { key: "bgLineThickness", label: "thickness", min: 0.3, max: 8, step: 0.1 },
      { key: "bgLineOpacity", label: "opacity", min: 0, max: 1, step: 0.01 },
      { key: "bgWaveAmount", label: "wave", min: 0, max: 1, step: 0.01 },
      { key: "bgWaveSpeed", label: "wave speed", min: 0, max: 2, step: 0.01 },
      {
        key: "bgRevealLightness",
        label: "reveal grey",
        min: 0,
        max: 1,
        step: 0.01,
      },
      {
        key: "bgRevealLightnessAlt",
        label: "reveal grey 2",
        min: 0,
        max: 1,
        step: 0.01,
      },
      {
        key: "bgRevealOpacity",
        label: "reveal alpha",
        min: 0,
        max: 1,
        step: 0.01,
      },
    ],
  },
  {
    title: "Entrance burn",
    sliders: [
      { key: "introDuration", label: "duration s", min: 0.5, max: 10, step: 0.1 },
      { key: "burnStart", label: "burn at", min: 0, max: 0.95, step: 0.01 },
      { key: "burnSoftness", label: "front", min: 0.02, max: 0.5, step: 0.005 },
      { key: "burnGlow", label: "glow", min: 0, max: 4, step: 0.05 },
      { key: "riseDistance", label: "rise px", min: 0, max: 900, step: 10 },
      { key: "riseDuration", label: "rise s", min: 0.2, max: 8, step: 0.1 },
    ],
  },
  {
    title: "Idle sweep",
    sliders: [
      { key: "autoSweepAmount", label: "amount", min: 0, max: 1.5, step: 0.01 },
      { key: "autoSweepPeriod", label: "every s", min: 0.5, max: 12, step: 0.1 },
      { key: "autoSweepStroke", label: "stroke s", min: 0.1, max: 3, step: 0.05 },
      { key: "sweepRadius", label: "brush", min: 0.05, max: 1.2, step: 0.01 },
      { key: "sweepWarp", label: "warp", min: 0, max: 2, step: 0.01 },
      { key: "sweepLength", label: "length", min: 0.02, max: 1, step: 0.01 },
      { key: "autoSweepHold", label: "pause s", min: 0, max: 4, step: 0.05 },
    ],
  },
  {
    title: "Scene",
    sliders: [
      { key: "cameraZ", label: "camera z", min: 4, max: 11, step: 0.05 },
      { key: "subjectScale", label: "subject", min: 0.6, max: 2, step: 0.01 },
      { key: "subjectX", label: "subject x", min: -1.5, max: 1.5, step: 0.01 },
      { key: "subjectY", label: "subject y", min: -1.5, max: 1.5, step: 0.01 },
      // The whole composition's own pointer multiplier; negative slides it
      // counter to the cursor.
      { key: "subjectParallax", label: "parallax", min: -0.8, max: 0.8, step: 0.005 },
    ],
  },
];

/** Everything on the halftone except which light it reads. */
type HalftoneKey = Exclude<keyof HalftoneParams, "source">;

const HALFTONE_SLIDERS: {
  key: HalftoneKey;
  label: string;
  min: number;
  max: number;
  step: number;
}[] = [
  { key: "threshold", label: "threshold", min: 0.05, max: 0.95, step: 0.01 },
  { key: "radius", label: "radius", min: 40, max: 460, step: 5 },
  { key: "waveSpeed", label: "wave s", min: 0.02, max: 0.9, step: 0.01 },
  { key: "fade", label: "fade s", min: 0.1, max: 3, step: 0.05 },
];

const SOURCES: { value: HalftoneSource; label: string }[] = [
  { value: "none", label: "cursor only" },
  { value: "edge", label: "lap edge" },
  { value: "wave", label: "wave" },
];

/**
 * Floating tuning panel for the hero effect — every scene parameter as a
 * live slider, with copy-to-clipboard so a tuned look can be pasted back
 * into DEFAULT_PARAMS. Lightweight custom panel (no lil-gui — see the
 * optimize-3d-scene skill's "what not to do").
 *
 * Development only — it is a tuning rig, not part of the hero, and it sits
 * over the design's top-right rail. It also starts collapsed so the frame is
 * unobstructed until someone asks for it.
 */
export const SceneControls = ({ params, onChange }: SceneControlsProps) => {
  // The halftone lives in the season block, two sections away; it reaches the
  // panel through its own store rather than being threaded down the page.
  const halftone = useHalftone();
  const [open, setOpen] = useState(false);
  /** Guards the portal — `document` only exists once mounted. */
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pasting, setPasting] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pasteError, setPasteError] = useState(false);

  useEffect(() => setMounted(true), []);

  const copy = async () => {
    await navigator.clipboard.writeText(JSON.stringify(params, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  /** Full replace from pasted JSON — the round-trip of "copy values". Only
   *  known keys with numeric values are applied; the rest is ignored. */
  const applyPaste = () => {
    try {
      const parsed: unknown = JSON.parse(pasteText);
      if (typeof parsed !== "object" || parsed === null) throw new Error();
      const incoming = parsed as Record<string, unknown>;
      const next: Partial<HeroSceneParams> = {};
      for (const key of Object.keys(DEFAULT_PARAMS) as (keyof HeroSceneParams)[]) {
        const value = incoming[key];
        if (typeof value === "number" && Number.isFinite(value)) {
          next[key] = value;
        }
      }
      if (Object.keys(next).length === 0) throw new Error();
      onChange(next);
      setPasting(false);
      setPasteText("");
      setPasteError(false);
    } catch {
      setPasteError(true);
    }
  };

  if (!mounted) return null;

  // Portalled to <body>. The panel lives inside the scene layer, which the
  // hero gives `z-0` so the rails paint over the canvas — that creates a
  // stacking context, and no z-index from within it can ever beat the rails'
  // `z-20`. Escaping to the body root is the only fix that survives future
  // layout changes.
  return createPortal(
    <aside
      aria-label="Scene controls"
      // Lenis listens for wheel on the window and preventDefaults it, so a
      // nested overflow container never receives one — the portal does not
      // escape that, since the listener is global rather than a DOM ancestor.
      // This opts the whole panel back into native scrolling.
      data-lenis-prevent
      // Off the right corner, where the page's own avatar sits. The panel is
      // a dev rig and the avatar is the design; the panel is what moves. It
      // has been reported three times because `right-4` put its collapse
      // control under the avatar at every width.
      className="fixed left-4 top-4 z-[9999] w-[20.5rem] max-w-[calc(100vw-2rem)] rounded-tile bg-surface-dark/90 p-4 text-foreground-on-dark backdrop-blur-sm"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-eyebrow uppercase tracking-[0.2em] text-foreground-on-dark-muted">
          Scene controls
        </h2>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-pill px-2 py-1 text-eyebrow uppercase tracking-[0.1em] transition-colors duration-[var(--duration-fast)] ease-entrance hover:text-accent"
        >
          {open ? "hide" : "show"}
        </button>
      </div>

      {open && (
        <div className="mt-3 flex max-h-[70lvh] flex-col gap-4 overflow-y-auto pr-1">
          {GROUPS.map((group) => (
            <fieldset key={group.title} className="flex flex-col gap-1.5">
              <legend className="mb-1 text-eyebrow uppercase tracking-[0.2em] text-accent">
                {group.title}
              </legend>
              {group.sliders.map(({ key, label, min, max, step }) => (
                <label
                  key={key}
                  className="grid grid-cols-[5.5rem_1fr_2.75rem] items-center gap-2 text-eyebrow uppercase tracking-[0.1em]"
                >
                  <span className="text-foreground-on-dark-muted">{label}</span>
                  <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={params[key]}
                    onChange={(e) => onChange({ [key]: Number(e.target.value) })}
                    className="accent-accent"
                  />
                  <span className="whitespace-nowrap text-right tabular-nums">
                    {params[key].toFixed(2)}
                  </span>
                </label>
              ))}
            </fieldset>
          ))}

          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1 text-eyebrow uppercase tracking-[0.2em] text-accent">
              Halftone ASCII
            </legend>

            <div className="mb-1 grid grid-cols-[5.5rem_1fr] items-center gap-2 text-eyebrow uppercase tracking-[0.1em]">
              <span className="text-foreground-on-dark-muted">light</span>
              <div className="flex gap-1">
                {SOURCES.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => halftone.set({ source: option.value })}
                    aria-pressed={halftone.source === option.value}
                    className={`flex-1 rounded-pill px-2 py-1 text-eyebrow uppercase tracking-[0.1em] transition-colors duration-[var(--duration-fast)] ease-entrance ${
                      halftone.source === option.value
                        ? "bg-accent text-surface-dark"
                        : "border border-border-on-dark hover:border-accent hover:text-accent"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {HALFTONE_SLIDERS.map(({ key, label, min, max, step }) => (
              <label
                key={key}
                className="grid grid-cols-[5.5rem_1fr_2.75rem] items-center gap-2 text-eyebrow uppercase tracking-[0.1em]"
              >
                <span className="text-foreground-on-dark-muted">{label}</span>
                <input
                  type="range"
                  min={min}
                  max={max}
                  step={step}
                  value={halftone[key]}
                  onChange={(e) =>
                    halftone.set({ [key]: Number(e.target.value) })
                  }
                  className="accent-accent"
                  // The wave keeps running whichever light is on, but its speed
                  // only shows when the wave is the one being read.
                  disabled={key === "waveSpeed" && halftone.source !== "wave"}
                />
                <span className="whitespace-nowrap text-right tabular-nums">
                  {halftone[key].toFixed(2)}
                </span>
              </label>
            ))}
          </fieldset>
        </div>
      )}

      {/* Outside the scroll area. With this many groups the actions were a
          long scroll from the top and effectively unfindable. */}
      {open && (
        <div className="mt-3 flex flex-col gap-2 border-t border-border-on-dark pt-3">
          {pasting ? (
            <div className="flex flex-col gap-2">
              <textarea
                value={pasteText}
                onChange={(e) => {
                  setPasteText(e.target.value);
                  setPasteError(false);
                }}
                placeholder='Paste params JSON — e.g. the output of "copy values"'
                rows={7}
                spellCheck={false}
                className={`w-full rounded-tile border bg-surface-dark-raised p-2 font-mono text-eyebrow normal-case text-foreground-on-dark placeholder:text-foreground-on-dark-muted ${
                  pasteError ? "border-highlight" : "border-border-on-dark"
                }`}
              />
              {pasteError && (
                <p className="text-eyebrow uppercase tracking-[0.1em] text-highlight">
                  invalid json — expected the copied params object
                </p>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={applyPaste}
                  className="flex-1 rounded-pill bg-accent px-3 py-2 text-eyebrow uppercase tracking-[0.1em] text-surface-dark transition-colors duration-[var(--duration-fast)] ease-entrance hover:bg-foreground-on-dark"
                >
                  apply
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPasting(false);
                    setPasteError(false);
                  }}
                  className="flex-1 rounded-pill border border-border-on-dark px-3 py-2 text-eyebrow uppercase tracking-[0.1em] transition-colors duration-[var(--duration-fast)] ease-entrance hover:border-accent hover:text-accent"
                >
                  cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={copy}
                // The primary action of the whole panel: tuning here is only
                // useful if the values can get back into DEFAULT_PARAMS.
                className="flex-1 rounded-pill bg-accent px-3 py-2 text-eyebrow uppercase tracking-[0.1em] text-surface-dark transition-colors duration-[var(--duration-fast)] ease-entrance hover:bg-foreground-on-dark"
              >
                {copied ? "copied!" : "copy"}
              </button>
              <button
                type="button"
                onClick={() => setPasting(true)}
                className="flex-1 rounded-pill border border-border-on-dark px-3 py-2 text-eyebrow uppercase tracking-[0.1em] transition-colors duration-[var(--duration-fast)] ease-entrance hover:border-accent hover:text-accent"
              >
                paste
              </button>
              <button
                type="button"
                onClick={() => {
                  onChange({ ...DEFAULT_PARAMS });
                  halftone.set({ ...HALFTONE_DEFAULTS });
                }}
                className="flex-1 rounded-pill border border-border-on-dark px-3 py-2 text-eyebrow uppercase tracking-[0.1em] transition-colors duration-[var(--duration-fast)] ease-entrance hover:border-accent hover:text-accent"
              >
                reset
              </button>
            </div>
          )}
        </div>
      )}
    </aside>,
    document.body,
  );
};
