"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useLoopInView } from "@/hooks/animation/use-loop-in-view";

import { SceneControls } from "./controls";
import {
  DEFAULT_PARAMS,
  fitSubjectToBox,
  HeroScene,
  HeroSceneParams,
} from "./scene";

export interface HeroSceneCanvasProps {
  /** Called once the scene has loaded and prewarmed (poster can fade). */
  onReady?: () => void;
  /**
   * Flips true as the loader's veil starts to fade. Starts the composition's
   * rise, so the scene's arrival and the veil's exit are one movement.
   */
  revealed?: boolean;
  /**
   * Screen-space box, in the canvas's own coordinates, that the subject should
   * fill. Lets the canvas be stretched over the whole block — so the backdrop's
   * animated contours cover it — while the portrait keeps the size and place
   * the box gives it. Omit and the subject fills the canvas as before.
   */
  fitTo?: {
    section: React.RefObject<HTMLElement | null>;
    box: React.RefObject<HTMLDivElement | null>;
  } | null;
}

/**
 * Bump when a rename would make old stored values mean something else — **or
 * when a default this panel can write is retuned and the new value has to
 * reach a machine that has already tuned.**
 */
// Bumped to v2 when the tuned values below became the defaults and the idle
// sweep was switched off. A blob written under v1 holds the old
// `autoSweepAmount`, and since a stored value always wins, the fix would
// not have reached anyone who had opened the panel until they hit Reset.
//
// Bumped to v3 for the helmet tilt (2026-09-07). Exactly the same trap, and it
// cost most of a session: `helmetRotX` and `tiltLimit` were retuned four times
// against a browser whose stored blob pinned them at older values, so every
// change landed in the source and none of it reached the screen — the symptom
// is "nothing changed", and it is indistinguishable from a broken edit.
//
// That is also why the blob now carries a fingerprint of the defaults it was
// written against (`DEFAULTS_STAMP_KEY`): retuning any default drops stale
// storage on its own, so this key should not need bumping by hand again.
// See obsidian/meta/decisions-log.md ADR-0028.
const PARAMS_STORAGE_KEY = "grido1:hero-scene-params:v3";

/**
 * Tuned values survive a reload — but **only in development**.
 *
 * The panel is a dev rig, and persistence has to be scoped the same way: a
 * stored blob on a visitor's machine would silently shadow `DEFAULT_PARAMS`
 * forever, so a future change to the shipped look would never reach anyone
 * who had once opened the page. `NODE_ENV` is statically replaced, so this
 * whole path folds away in a production build.
 */
const PERSIST_PARAMS = process.env.NODE_ENV === "development";

/**
 * Whether the tuning panel is mounted at all. Development-only either way —
 * this is the owner's switch for hiding it *in* development, once a pass is
 * tuned and the rig is in the way of looking at the result (off since
 * 2026-09-08). Flip to `true` to tune again; nothing else needs to change.
 */
const SHOW_CONTROLS = false;

/**
 * Reserved key inside the stored blob. Not a param name, so `readStoredParams`
 * ignores it on the way back in — it only reads keys `DEFAULT_PARAMS` has.
 */
const DEFAULTS_STAMP_KEY = "__defaults";

/**
 * Fingerprint of the shipped defaults. A stored blob carrying a different one
 * was written against a look that no longer exists, and is dropped rather than
 * allowed to shadow it.
 */
const defaultsStamp = () =>
  (Object.keys(DEFAULT_PARAMS) as (keyof HeroSceneParams)[])
    .map((key) => `${key}:${DEFAULT_PARAMS[key]}`)
    .join("|");

/**
 * Reads stored params, keeping only known keys holding finite numbers.
 *
 * The filter is not paranoia. Params have been added repeatedly, and a blob
 * written before one existed would leave that key `undefined` — which reaches
 * the shaders as a `NaN` uniform and blanks the scene. Merging the survivors
 * over `DEFAULT_PARAMS` means a new param always gets its default.
 */
const readStoredParams = (): HeroSceneParams => {
  const defaults = { ...DEFAULT_PARAMS };
  if (!PERSIST_PARAMS || typeof window === "undefined") return defaults;
  try {
    const raw = window.localStorage.getItem(PARAMS_STORAGE_KEY);
    if (!raw) return defaults;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return defaults;
    const incoming = parsed as Record<string, unknown>;

    // Retuning a default invalidates the blob, automatically. Without this the
    // only remedy was noticing and bumping the key by hand, which is a remedy
    // that depends on suspecting the bug — and the bug's symptom is "the edit
    // did nothing", which points at the edit. Every stored value is one a
    // slider wrote, so nothing here is worth shadowing a deliberate change to
    // the shipped look.
    if (incoming[DEFAULTS_STAMP_KEY] !== defaultsStamp()) {
      window.localStorage.removeItem(PARAMS_STORAGE_KEY);
      return defaults;
    }

    for (const key of Object.keys(defaults) as (keyof HeroSceneParams)[]) {
      const value = incoming[key];
      if (typeof value === "number" && Number.isFinite(value)) {
        defaults[key] = value;
      }
    }
    return defaults;
  } catch {
    // Corrupt or unavailable (private mode, quota) — the defaults are fine.
    return defaults;
  }
};

/**
 * React wrapper around the three.js hero scene. The render loop rides the
 * project's shared ticker (`useLoopInView`) at the tier's frame budget, so
 * it only runs while the hero is on screen. Pointer input follows the tier
 * (no listener at all on touch), and the resize path re-reads the tier on
 * every width change — height-only changes are ignored on touch, because
 * that is what the iOS URL bar collapsing is, and rebuilding the framebuffer
 * mid-scroll reads as a flash.
 */
/**
 * How far down the page the hero counts as covered, in viewports. The next
 * block has taken the whole screen by 1.0; the margin keeps the scene warm
 * for a scroll back up.
 */
const COVERED_AFTER = 1.15;

export const HeroSceneCanvas = ({
  onReady,
  revealed = false,
  fitTo = null,
}: HeroSceneCanvasProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<HeroScene | null>(null);
  // Tier frame budget — state (not a ref read) because useLoop reads its
  // `framerate` prop live each tick.
  const [frameInterval, setFrameInterval] = useState(0);
  // Lazy initialiser: reads localStorage once, before the scene is built, so
  // the first rendered frame is already the stored look rather than the
  // defaults flashing first.
  const [params, setParams] = useState<HeroSceneParams>(readStoredParams);
  // Deliberately a ref, not state. This is measured geometry feeding a canvas;
  // routing it through a render would re-render the hero on every resize tick,
  // and the springs under it re-seed when their parent renders.
  const paramsRef = useRef(params);

  /**
   * Pushes the panel's values into the scene with the subject re-fitted to its
   * box. Imperative on purpose — see `paramsRef`.
   */
  const applyFit = useCallback(() => {
    const scene = sceneRef.current;
    const container = containerRef.current;
    if (!scene || !container) return;

    const current = paramsRef.current;
    const box = fitTo?.box.current;
    const section = fitTo?.section.current;
    const height = container.clientHeight;

    // `offsetParent` is null once the box is display:none — then the subject
    // fills the canvas, which is what desktop wants.
    if (!box || box.offsetParent === null || !section || height <= 0) {
      scene.setParams(current);
      return;
    }

    const s = section.getBoundingClientRect();
    const b = box.getBoundingClientRect();
    scene.setParams({
      ...current,
      ...fitSubjectToBox(
        current,
        { top: b.top - s.top, height: b.height },
        height,
      ),
      // The cursor reveal is parked at a fixed point on touch, and below `md`
      // the rails and footer stack *under* the portrait — so a canvas that now
      // spans the section put that grey wash straight behind them. It has
      // nothing to reveal there: no pointer, no subject.
      // **Every touch width, not just phones.** The cursor reveal is parked at
      // a fixed point where there is no pointer, so the grey wash it paints
      // never moves and reads as a blob behind the figure. 767 left it on at
      // 768, which is exactly where it was reported.
      ...(window.matchMedia("(max-width: 1023px)").matches
        ? { bgRevealOpacity: 0 }
        : null),
      // And where there is no pointer at all, the reveal is **driven for the
      // reader**: the idle sweep is a second, synthetic cursor, switched off
      // on desktop because a real one is there. On a touch screen it is the
      // only thing that can play the effect, so it comes back.
      ...(window.matchMedia("(hover: none)").matches
        ? { autoSweepAmount: 0.76 }
        : null),
      // **The brush is sized for the screen, not for the subject.** It is a
      // radius in normalised device coordinates, so on a 390x844 phone a
      // third of the half-height is 139 real pixels against a helmet some
      // 500 tall: the sweep cut two bands across the face and left the rest
      // unrevealed, with the warp tearing their edges. A brush wider than the
      // subject reveals it as one mass — which is what the effect reads as
      // under a real cursor, where the pointer wanders over the whole face
      // rather than crossing it once. The path shortens with it, since a
      // broad brush no longer needs to travel to cover the head.
      ...(window.matchMedia("(max-width: 639px)").matches
        ? { sweepRadius: 0.95, sweepWarp: 0.18, autoSweepAmount: 0.55 }
        : null),
      // Last, because it overrides the two above: on a tier with the reveal
      // switched off the sweep does not run at all. The entrance burn still
      // plays; after it the helmet has dissolved and stays dissolved. See
      // `SceneTier.reveal`. Read from the tier rather than a media query so
      // it follows a tier change like everything else the tier decides.
      ...(scene.tier.reveal ? null : { autoSweepAmount: 0 }),
    });
  }, [fitTo]);

  const applyParams = (partial: Partial<HeroSceneParams>) => {
    setParams((prev) => ({ ...prev, ...partial }));
  };

  // Panel edits still have to reach the scene, re-fitted. The ref is written
  // here rather than during render — a render must not touch it.
  useEffect(() => {
    paramsRef.current = params;
    applyFit();
  }, [params, applyFit]);

  // The scene is built once, so its resize pass reaches `applyFit` through a
  // ref instead of re-running the whole setup whenever the callback changes.
  const applyFitRef = useRef(applyFit);
  useEffect(() => {
    applyFitRef.current = applyFit;
  }, [applyFit]);

  // Written from an effect rather than inside the state updater — an updater
  // must stay pure, and StrictMode calls it twice.
  useEffect(() => {
    if (!PERSIST_PARAMS) return;
    try {
      const isDefault = (
        Object.keys(DEFAULT_PARAMS) as (keyof HeroSceneParams)[]
      ).every((key) => params[key] === DEFAULT_PARAMS[key]);
      // Clearing on reset matters: a stored copy of the current defaults would
      // still shadow the next change to them.
      if (isDefault) window.localStorage.removeItem(PARAMS_STORAGE_KEY);
      else
        window.localStorage.setItem(
          PARAMS_STORAGE_KEY,
          JSON.stringify({ ...params, [DEFAULTS_STAMP_KEY]: defaultsStamp() }),
        );
    } catch {
      // Quota or private mode — tuning still works, it just will not persist.
    }
  }, [params]);

  /**
   * The pointer listener, attached and detached to follow the tier rather
   * than fixed at mount — a tier that gains a cursor mid-session (see the
   * resize effect) needs the listener it was never given. Not attached at all
   * on a touch tier, not "attached and ignored" (optimize-3d-scene §11).
   */
  const removePointerRef = useRef<(() => void) | null>(null);
  const bindPointer = (enabled: boolean) => {
    const scene = sceneRef.current;
    removePointerRef.current?.();
    removePointerRef.current = null;
    if (!enabled || !scene) return;
    const onPointerMove = (event: PointerEvent) => {
      scene.setPointer(
        (event.clientX / window.innerWidth) * 2 - 1,
        (event.clientY / window.innerHeight) * 2 - 1,
      );
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    removePointerRef.current = () =>
      window.removeEventListener("pointermove", onPointerMove);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const scene = new HeroScene(canvas);
    // The scene constructs from DEFAULT_PARAMS; hand it whatever the panel
    // restored before the first frame is drawn.
    scene.setParams(params);
    scene.resize(container.clientWidth, container.clientHeight);
    applyFitRef.current();
    scene.onReady = () => onReady?.();
    sceneRef.current = scene;
    setFrameInterval(scene.tier.frameInterval);
    bindPointer(scene.tier.pointerEnabled);

    return () => {
      bindPointer(false);
      scene.dispose();
      sceneRef.current = null;
    };
    // Mount-only — the scene owns its lifecycle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Resize is observed on the *container*, not the window, on **every**
   * tier — and on a touch-class tier only a change of **width** counts.
   *
   * Three generations of bug here. Gating on `tier.mobile` meant a desktop
   * window that merely *started* narrow was classed mobile for its whole
   * session and never resized. Gating on `coarsePointer` fixed that and
   * introduced the next one: a page opened under a device emulator, or on a
   * tablet turned to face a docked keyboard, kept a phone's canvas size, its
   * frame budget, its parked pointer and its hidden wireframe after the
   * viewport had become a desktop's — nothing ever re-read the tier because
   * the whole observer had been switched off.
   *
   * The rule both were protecting exists for iOS, where the URL bar
   * collapsing fires `resize` mid-scroll and rebuilding the framebuffer reads
   * as a flash. That event changes the **height only**, so that is what is
   * ignored, and only where the pointer is coarse. A width change on a touch
   * device is a rotation or an emulator being switched off, and both should
   * reflow. The container is observed rather than the window because the
   * container is what changes at the breakpoint; the window may not change
   * at all if the layout reflows for another reason.
   *
   * The pointer class is watched too: it is the one tier input a resize
   * cannot see, and an emulator being switched off flips it.
   */
  useEffect(() => {
    const container = containerRef.current;
    const scene = sceneRef.current;
    if (!container || !scene) return;

    let frame = 0;
    let lastWidth = container.clientWidth;
    const reconsider = () => {
      // Coalesce into a frame: a drag fires this continuously, and each call
      // reallocates the drawing buffer.
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        // Everything the tier decides may have changed — DPR, budget,
        // pointer, wireframe — so re-read it first, then act on the result.
        const tier = scene.retune();
        const width = container.clientWidth;
        const widthChanged = width !== lastWidth;
        lastWidth = width;
        if (tier.coarsePointer && !widthChanged) return;

        scene.resize(width, container.clientHeight);
        applyFitRef.current();
        setFrameInterval(tier.frameInterval);
        bindPointer(tier.pointerEnabled);
      });
    };

    const observer = new ResizeObserver(reconsider);
    observer.observe(container);
    const pointerClass = window.matchMedia("(hover: none) and (pointer: coarse)");
    pointerClass.addEventListener("change", reconsider);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      pointerClass.removeEventListener("change", reconsider);
    };
    // Mount-only, like the scene it follows; `bindPointer` reads refs.
  }, []);

  useEffect(() => {
    if (revealed) sceneRef.current?.beginRise();
  }, [revealed]);

  /**
   * **The in-view observer cannot see this block being covered.**
   *
   * The hero is the first layer of the sticky stack: it pins at `top: 0` and
   * the blocks after it scroll *over* it, so its rect never leaves the
   * viewport and `IntersectionObserver` reports it visible for the whole
   * page. Measured on a phone, the scene went on drawing at 22fps three
   * screens down — the single largest waste in the page (optimize-3d-scene
   * §4).
   *
   * The test is the scroll position rather than the element's own geometry,
   * because the geometry is exactly what the pin makes useless. One read per
   * frame inside the ticker, no layout, and the same margin the stack itself
   * uses to decide the layer is fully covered.
   */
  const isCovered = () =>
    typeof window !== "undefined" &&
    window.scrollY > window.innerHeight * COVERED_AFTER;

  useLoopInView(
    containerRef as React.RefObject<HTMLDivElement>,
    (time) => {
      if (document.hidden || isCovered()) return;
      sceneRef.current?.update(time);
    },
    { framerate: frameInterval },
  );

  return (
    <>
      <div
        ref={containerRef}
        className="pointer-events-none absolute inset-0 transform-gpu backface-hidden will-change-transform"
      >
        <canvas ref={canvasRef} className="size-full" aria-hidden />
      </div>
      {process.env.NODE_ENV === "development" && SHOW_CONTROLS && (
        <SceneControls params={params} onChange={applyParams} />
      )}
    </>
  );
};
