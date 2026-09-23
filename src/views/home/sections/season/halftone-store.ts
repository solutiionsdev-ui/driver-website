"use client";

// 📖 Docs: obsidian/frontend/components/sections.md

import { create } from "zustand";

/**
 * Which ambient light the halftone reads, on top of the cursor.
 *
 * `none` is the shipped setting and the reason it exists: with `edge` the lap's
 * own head lit the field as the trace drew, so the block loaded through a
 * travelling cluster of glyphs instead of laying its line down cleanly. The
 * other two stay for the tuning panel.
 */
export type HalftoneSource = "none" | "edge" | "wave";

export interface HalftoneParams {
  source: HalftoneSource;
  /** Brightness a dot must reach before it squares up into a chequer. */
  threshold: number;
  /** How far the light reaches, in map units. */
  radius: number;
  /** Map widths the wave travels per second. */
  waveSpeed: number;
  /** Seconds for a lit dot to fall back to a dot. */
  fade: number;
}

export const HALFTONE_DEFAULTS: HalftoneParams = {
  source: "none",
  threshold: 0.34,
  radius: 170,
  waveSpeed: 0.16,
  fade: 0.9,
};

interface HalftoneStore extends HalftoneParams {
  set: (partial: Partial<HalftoneParams>) => void;
  reset: () => void;
}

/**
 * A store rather than props, because the two ends of this are far apart: the
 * tuning panel lives in the hero's scene layer and the field it tunes lives in
 * the season block. Threading params between two sibling sections through the
 * page would put a dev rig into the shape of the production tree.
 */
export const useHalftone = create<HalftoneStore>((set) => ({
  ...HALFTONE_DEFAULTS,
  set: (partial) => set(partial),
  reset: () => set({ ...HALFTONE_DEFAULTS }),
}));
