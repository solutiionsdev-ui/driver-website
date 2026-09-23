"use client";

// 📖 Docs: obsidian/frontend/components/sections.md

import { useEffect, useRef, type ReactNode } from "react";

export interface SectionStackProps {
  children: ReactNode;
}

/** How small a block gets once the one after it has covered it. */
const RECEDE_SCALE = 0.9;
/** How far it darkens over the same run. */
const RECEDE_SHADE = 0.55;

/**
 * The seam between the first three blocks: each one **comes out over** the one
 * before it, and the one it covers recedes rather than scrolling away.
 *
 * The mechanism is `position: sticky` and nothing else. Every layer but the
 * last pins at the top of the viewport; the next layer is later in the DOM
 * with a higher stacking order, so it simply scrolls up over the pinned one.
 * The stack's own container is what bounds it — the last layer is in normal
 * flow, so when its bottom passes, everything unpins together and the rest of
 * the page carries on as an ordinary document.
 *
 * **The recede is written straight to the DOM.** Progress is read from the
 * covering layer's own `top` against the viewport, in a passive scroll
 * listener that writes `transform` and an overlay's `opacity` through refs.
 * Routing it through state would re-render three full sections — one of which
 * owns a WebGL scene — on every scroll event, and routing it through the
 * spring kit is not possible here: `useSpringTrigger` reads the rect of the
 * element it animates, and a pinned element's rect does not move. The layer
 * that moves is the *next* one, which is not the one being transformed.
 */
export const SectionStack = ({ children }: SectionStackProps) => {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const layers = [...root.children] as HTMLElement[];
    // Every layer but the last both pins and recedes; the last only covers.
    const pinned = layers.slice(0, -1).map((layer, index) => ({
      inner: layer.firstElementChild as HTMLElement | null,
      shade: layer.lastElementChild as HTMLElement | null,
      next: layers[index + 1],
    }));

    /**
     * **No shrink on a phone.** The recede scales the covered layer about its
     * own centre, which opens a frame of whatever sits behind it on all four
     * sides. On a wide screen that ground is the stack's own black and the
     * step back reads as depth; on a phone the layers are shorter than the
     * screen and the frame lands on the light block behind, which reads as a
     * gap in the page rather than as a block stepping back. The shade still
     * runs there, so the covered block still recedes — it just does it by
     * going dark instead of by getting smaller.
     */
    const phone = window.matchMedia("(max-width: 639px)");

    let frame = 0;
    const apply = () => {
      frame = 0;
      const view = window.innerHeight || 1;
      const shrink = phone.matches ? 0 : 1 - RECEDE_SCALE;
      for (const { inner, shade, next } of pinned) {
        if (!inner || !shade) continue;
        // 0 while the next block is still a full screen away, 1 once it has
        // taken the whole viewport.
        const p = Math.min(
          1,
          Math.max(0, 1 - next.getBoundingClientRect().top / view),
        );
        // **No transform at rest, and that is not an optimisation.** A
        // transformed element becomes the containing block for any `position:
        // fixed` descendant, so a `scale(1)` sitting here permanently was
        // enough to make the hero's full-screen preloader resolve against the
        // hero's own box instead of the viewport — it centred in an 804-tall
        // section on a 768-tall screen and sat visibly low. `will-change` does
        // the same thing, so it goes on only while the layer is moving.
        inner.style.transform =
          p > 0 && shrink > 0 ? `scale(${1 - shrink * p})` : "";
        inner.style.willChange = p > 0 && shrink > 0 ? "transform" : "";
        shade.style.opacity = `${RECEDE_SHADE * p}`;
        // Once it is completely covered there is nothing to paint, and the
        // hero's scene is expensive to keep compositing behind two screens of
        // other content.
        inner.style.visibility = p >= 1 ? "hidden" : "visible";
      }
    };

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(apply);
    };

    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    // The ground the receding blocks sit on. Without it a shrinking layer
    // shows the document's own background around its edges, which reads as a
    // gap rather than as a block stepping back.
    <div ref={rootRef} className="relative bg-surface-black">
      {children}
    </div>
  );
};

export interface StackLayerProps {
  children: ReactNode;
  /** Paint order. Later layers must sit over earlier ones. */
  z: number;
  /** The last layer scrolls normally; it covers but is never covered. */
  pinned?: boolean;
}

/**
 * One layer of the stack. The transform lives on an inner wrapper rather than
 * on the sticky element itself: a transform creates a containing block, and a
 * transformed ancestor takes `position: sticky` out of the viewport's frame of
 * reference, so the pin would stop working the moment the recede began.
 */
export const StackLayer = ({ children, z, pinned = true }: StackLayerProps) => (
  <div className={pinned ? "sticky top-0" : "relative"} style={{ zIndex: z }}>
    <div className="origin-center">{children}</div>
    {pinned ? (
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-surface-black opacity-0"
      />
    ) : null}
  </div>
);
