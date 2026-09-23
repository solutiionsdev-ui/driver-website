---
tags: [frontend]
updated: 2026-08-04
---

# Catalog — UI Components

Files in `src/components/ui/` — design-system primitives: stateless, no provider
dependencies. Conventions: [[component-conventions]].

> [!note] Currently empty (2026-07-26)
> The folder was populated during the Lando Norris page build (`Eyebrow`,
> `PillLink`, `SectionIntro`, `Marquee`) and emptied again in two waves as the
> page was reduced to the bare hero effect — see [[changelog]]. All four are
> recoverable from git history; the Marquee pattern (children ×2, −50% wrap,
> `useLoopInView` on the shared ticker) is the one worth re-vendoring first.
> The hero's scene-tuning panel lives with its feature
> (`src/views/home/sections/hero-scene/controls.tsx`), not here. It is
> development-only, and since 2026-09-08 also behind `SHOW_CONTROLS` in
> `hero-scene/index.tsx`, which is **off** — flip it to tune.
>
> **Still empty after the GRIDO1 hero build (2026-08-04).** Everything that
> build added is feature-local under `views/home/sections/hero/`. The one
> judgement call worth recording: `BracketPanel` — the corner-bracket frame —
> *looks* like a `ui/` primitive, but only the hero's two side panels use it,
> and the rule is that a component earns promotion by having a second caller.
> Move it here when a second section wants that frame, not before.

## Related

[[component-conventions]] · [[components/common]] · [[components/animation-springs]]
