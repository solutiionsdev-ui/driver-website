"use client";

// 📖 Docs: obsidian/frontend/components/sections.md

import { useEffect } from "react";

import { useScroll } from "@/hooks/smooth-scroll/use-scroll";

/** Past the hero's loader and the first layout pass, for a `/#id` arrival. */
const ARRIVAL_DELAY = 400;

/**
 * Where an element sits in the document's flow, in scroll px.
 *
 * Inside the section stack a layer is `position: sticky`, so its rect reports
 * where it is *stuck* — scrolled past the hero, the season layer reads 0 and a
 * native anchor jump would go nowhere. A layer's flow position is the stack's
 * own top plus the heights of the layers before it, and that is what is read
 * here. Anything outside the stack is in ordinary flow, so its rect is true.
 */
const flowTop = (target: HTMLElement): number => {
  const layer = target.closest<HTMLElement>("[data-stack-layer]");
  const stack = layer?.parentElement;
  if (!layer || !stack) {
    return target.getBoundingClientRect().top + window.scrollY;
  }

  let top = stack.getBoundingClientRect().top + window.scrollY;
  for (const sibling of stack.children) {
    if (sibling === layer) break;
    top += (sibling as HTMLElement).offsetHeight;
  }
  return target === layer
    ? top
    : top + target.getBoundingClientRect().top - layer.getBoundingClientRect().top;
};

const scrollToTarget = (target: HTMLElement) => {
  const top = flowTop(target);
  const immediate = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const lenis = useScroll.getState().lenis;
  // `force`: the mobile menu sheet stops Lenis while it is open, and the link
  // that closes it is the same click that asks for this scroll.
  if (lenis) lenis.scrollTo(top, { immediate, force: true });
  else window.scrollTo({ top, behavior: immediate ? "instant" : "smooth" });
};

/**
 * Resolves the page's own `/#id` links — the masthead, the menu sheet, the
 * footer and the hero's profile button all point into the page.
 *
 * It listens in the **capture** phase on `document`, which runs before
 * React's root listener: preventing the default there makes `next/link` skip
 * its own hash navigation (it bails on `defaultPrevented`), while the link's
 * own `onClick` — closing the menu sheet — still runs. Also handles arriving
 * from another route with a hash already in the URL.
 */
export const AnchorScroll = () => {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
      const link = (event.target as Element | null)?.closest("a");
      if (!link || link.target === "_blank") return;

      const url = new URL(link.href, window.location.href);
      if (
        url.origin !== window.location.origin ||
        url.pathname !== window.location.pathname ||
        !url.hash
      ) {
        return;
      }
      const target = document.getElementById(decodeURIComponent(url.hash.slice(1)));
      if (!target) return;

      event.preventDefault();
      window.history.replaceState(window.history.state, "", url.hash);
      // Two frames: lets the menu sheet's close commit and restart scrolling
      // before the page is asked to move.
      requestAnimationFrame(() =>
        requestAnimationFrame(() => scrollToTarget(target)),
      );
    };

    document.addEventListener("click", onClick, { capture: true });

    let arrival = 0;
    const hash = window.location.hash.slice(1);
    const initial = hash ? document.getElementById(decodeURIComponent(hash)) : null;
    if (initial) {
      arrival = window.setTimeout(() => scrollToTarget(initial), ARRIVAL_DELAY);
    }

    return () => {
      document.removeEventListener("click", onClick, { capture: true });
      window.clearTimeout(arrival);
    };
  }, []);

  return null;
};
