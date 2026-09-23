---
tags: [frontend, scroll, stable]
updated: 2026-08-04
---

# Smooth Scroll — Lenis

Smooth scrolling is provided by **Lenis** (`^1.3.19`), integrated through
`ScrollLayout` and a Zustand store.

## Components & files

| File | Role |
|------|------|
| `src/layouts/scroll-layout.tsx` | `ScrollLayout` wrapper + `ScrollController` |
| `src/hooks/smooth-scroll/use-scroll.ts` | `useScroll` Zustand store |
| `src/utils/scroll-to.ts` | `scrollTo()` programmatic scroll helper |

## ScrollLayout

Wraps the whole app (mounted in `app/layout.tsx`). It splits into:

- A **server-safe shell** — renders `{children}` so content is SSR-friendly.
- `<ScrollController>` — a client-only, render-nothing component that owns Lenis.

`ScrollController` on mount:
1. Resets scroll to top.
2. Creates `new Lenis({ smoothWheel: true })`, stores it on `window.lenis` and in
   the [[data-flow|scroll store]].
3. Starts a `requestAnimationFrame` loop calling `lenis.raf(time)`.
4. Watches `isEnableScroll` — starts/stops Lenis and locks/unlocks native scroll
   (`html { overflow: hidden }`) accordingly.
5. Watches `pathname` for `#hash` → smooth-scrolls to the target after 300 ms.

`scrollSpeed` is an exported mutable `{ current: 1 }` — adjust to change global speed.

## Nested scroll areas need `data-lenis-prevent`

> [!warning] A scrollable panel inside the app will **not** scroll by default
> Lenis binds `wheel` on the **window** and calls `preventDefault()`, so a
> nested `overflow-y-auto` never receives the event. The element looks
> correctly sized and has real overflow — it simply never moves, which reads
> like a CSS or `z-index` bug and is neither.

Put `data-lenis-prevent` on the scrollable element, or on a wrapper around it —
Lenis walks the event's composed path and bails if it finds the attribute:

```tsx
<aside data-lenis-prevent className="fixed …">
  <div className="max-h-[70lvh] overflow-y-auto">…</div>
</aside>
```

Portalling to `<body>` does **not** avoid this. The listener is global, not a
DOM ancestor, so escaping the React tree changes nothing. Variants exist for
finer control: `data-lenis-prevent-wheel`, `-touch`, `-vertical`, `-horizontal`.

Live example: the hero's dev tuning panel
(`views/home/sections/hero-scene/controls.tsx`).

## The scroll store

```ts
import { useScroll } from "@/hooks/smooth-scroll/use-scroll";
import { useShallow } from "zustand/react/shallow";

const lenis = useScroll((s) => s.lenis);
const [start, stop] = useScroll(useShallow((s) => [s.start, s.stop]));
```

| Field | Type | Purpose |
|-------|------|---------|
| `lenis` | `Lenis \| null` | the live instance |
| `setLenis` | fn | setter (used by `ScrollController`) |
| `isEnableScroll` | `boolean` | is scrolling allowed |
| `start()` / `stop()` | fn | toggle scroll (e.g. lock when a modal opens) |

## Programmatic scrolling

```ts
import { scrollTo } from "@/utils/scroll-to";

scrollTo("#section-id", true);  // smooth scroll to an element id
scrollTo(0);                    // back to top
```

`scrollTo` temporarily disables scroll state during the animation when needed.

## Related

[[data-flow]] · [[system-overview]] · [[hooks]]
