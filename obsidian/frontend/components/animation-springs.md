---
tags: [frontend, animation, stable, do-not-modify]
updated: 2026-09-08
---

# Catalog — Spring Components

Files in `src/components/animation/springs/`. The animation engine — `#do-not-modify`.
Conceptual overview: [[animation-system]].

All components accept `tag` (semantic HTML element), `className`, and react-spring
`config`. Each is `"use client"`.

## `<Inview>` — `in-view.tsx`

Springs `from` → `to` when the element enters the viewport (IntersectionObserver).

- `mode`: `"once"` (play once, stay) · `"always"` (reverse on leave) · `"forward"`
  (only on downward scroll).
- `delayIn` / `delayOut`, `immediateOut`, `disableOnMobile`.
- `trigger` — optional external element to observe. Omit it and the component
  observes its own rendered element (the common case).
- `innerTag` / `innerClassName` — the inner animated wrapper.

## `<Spring>` — `spring.tsx`

Unconditional spring driven by mount / the `enabled` flag. Same `mode` set as
`<Inview>`. Use when motion shouldn't depend on the viewport.

**Entrance gate + stagger.** This is the shape to copy for a page entrance:
hold `enabled` false until whatever you are waiting on resolves, then flip it
once and let `delayIn` space the blocks out. Live example — the hero's reveal
after its loader hands over (`views/home/sections/hero/index.tsx`).

```tsx
<Spring enabled={revealed} delayIn={180}
        from={{ opacity: 0, transform: "translateY(1.25rem)" }}
        to={{ opacity: 1, transform: "translateY(0rem)" }}
        config={{ tension: 90, friction: 26 }} />
```

> [!warning] Never unmount a `<Spring>` on a timer
> A spring approaches its target asymptotically — it has no duration, and the
> component exposes no `onRest`. Removing the element after a fixed delay cuts
> the animation off at whatever value the timer catches, which reads as a pop.
> Poll the **rendered** value instead and unmount once it is imperceptible:
>
> ```tsx
> const ref = useRef<HTMLElement>(null);   // <Spring> forwards refs
> useEffect(() => {
>   if (!exiting) return;
>   let frame = 0;
>   const check = () => {
>     const el = ref.current;
>     if (!el || Number(getComputedStyle(el).opacity) <= 0.004) return setDone(true);
>     frame = requestAnimationFrame(check);
>   };
>   frame = requestAnimationFrame(check);
>   return () => cancelAnimationFrame(frame);
> }, [exiting]);
> ```
>
> 0.004 is below one 8-bit channel step, so removal cannot change a pixel.
> Keep a timeout as a backstop — rAF pauses in a background tab. Live example:
> `views/home/sections/hero/hero-loader.tsx`.

> [!warning] `enabled` gives you two states, never three
> The spring targets `to` when active and `from` when not — so a value that
> needs an intermediate resting point cannot be driven by toggling `enabled`.
> **Move the `to` target instead** and leave `enabled` true; `useSpring` diffs
> values each render, so re-targeting mid-flight just works. The hero loader's
> meter does this — it creeps toward 70% under a soft `config`, then
> re-targets 100% under a stiff one, which `enabled` alone could not express.

## `<SpringTrigger>` — `spring-trigger.tsx`

Scroll-progress animation between two trigger points.

- `mode`: `"scrub"` (continuously interpolate with scroll — parallax, progress bars)
  · `"toggle"` (snap between `from`/`to` at the trigger point).
- `start` / `end` — `TriggerPos` strings (see [[text-engine]]).
- `trigger` — optional external scroll-reference element.
- `onChange({ progress, interpolatedProgress })` callback.
- `frameInterval` — throttle for the scroll handler.

> [!warning] Move it on a plain property, not on `transform`
> Two obvious routes to a parallax both fail **silently** — no error, the
> element just sits still:
>
> - react-spring's `y` shorthand builds `translate3d` from *numbers*; hand it a
>   percentage string and it resolves to `transform: none`.
> - A whole `transform: translateY(-30%)` goes through the trigger's own
>   `interpolate` (`src/utils/math.ts`), whose transform-function branch
>   rebuilds the value as `translateY(-15(%)` — a stray bracket, invalid CSS,
>   so react-spring holds the last value it could parse.
>
> `interpolate`'s plain-unit branch is correct, so animate a **bare unit on a
> plain property** — `top` against a `relative` inner box is the route both
> timeline parallaxes take. Bare *numbers* on `y` work too, if fixed pixels are
> acceptable.

> [!warning] It emits `div` inside `div` — check where you are putting it
> `tag` and `innerTag` both default to `"div"`, so dropping a `SpringTrigger`
> inside a `<p>` or a `<span>` is invalid nesting: React logs a hydration
> error and the browser closes the paragraph early. Pass
> `tag="span" innerTag="span"` there and make the boxes blocks by class —
> `ParallaxLayer` in `timeline-row.tsx` takes an `inline` prop that does
> exactly this.

## `<ProgressTrigger>` — `progress-trigger.tsx`

Tracks scroll position and emits a normalised **0–1 progress** value via
`onChange` — no animation of its own. Use to drive custom logic.

## `<Hover>` — `hover.tsx`

Spring on mouse enter/leave. Disabled on mobile by default (`disableOnMobile.hover`
is always `true`). `trigger` lets a different element fire the hover.

> [!note] Not every hover needs this (ADR-0014)
> A hover that only changes **colour, opacity, or border** is plain CSS —
> `transition-colors duration-[var(--duration-fast)] ease-entrance
> hover:text-foreground` — and needs no component at all. Reach for `<Hover>`
> when the motion is physical or interruptible, animates transforms, or must be
> driven from another element via `trigger`. See
> [[design-system#Motion: springs first, CSS for trivial state]].

## `<Handle>` — `handle.tsx`

Smooth enter/exit when `children` change — caches previous content during the
transition. Configurable `from`/`to`, `delayIn`/`delayOut`, `enabled`.

## `<AnimatedVarTextTag>` — `animated-var-text-tag.tsx`

Low-level primitive: renders `animated[tag]` with a forwarded ref. Building block
for the other components — rarely used directly.

## Related

[[animation-system]] · [[hooks]] · [[components/common]]
