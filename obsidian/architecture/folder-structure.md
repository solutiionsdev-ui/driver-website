---
tags: [architecture, stable]
updated: 2026-09-07
---

# Folder Structure

Where everything lives and what belongs where. The repo has two top-level concerns:
the **app** (`src/`) and this **vault** (`obsidian/`).

## Repo root

```
next16-claude-starter/
├── src/                     ← application code (see below)
├── public/                  ← static assets (see "public/" section below)
├── scripts/                 ← one-off asset builders, run by hand with node
│   ├── generate-person-maps.mjs   # portrait → diffuse/alpha/depth/normal
│   ├── recolor-helmet.mjs         # helmet/visor atlases → de-branded; loader mask
│   └── generate-open-graph.mjs    # share image + full favicon set + favicon.ico
├── obsidian/                ← this Obsidian vault — ALL project documentation
├── .claude/settings.json    ← Claude Code hooks — automate the vault workflow
├── app config files         ← next.config.ts, tsconfig, eslint, postcss
├── README.md                ← project README → points into the vault
├── AGENTS.md                ← agent guide — breaking-change warning, hard rules, vault pointer
├── CLAUDE.md                ← Claude Code entry → @AGENTS.md
└── .cursorrules             ← Cursor entry → @AGENTS.md
```

All documentation lives in the vault. The root `AGENTS.md` / `CLAUDE.md` /
`.cursorrules` are thin shims that carry the hard rules and point into it —
see [[ai-agent-guide]]. `.claude/settings.json` holds hooks that enforce the
documentation workflow automatically — also see [[ai-agent-guide]].

## `src/` — application code

```
src/
├── env.ts                  # zod-validated env (public + server-only split)
│
├── app/                    # Next.js routes — keep lean, routing only
│   ├── layout.tsx          # Root layout — provider tree lives here
│   ├── page.tsx            # Route → delegates to a view
│   ├── api/<resource>/route.ts  # API endpoints — see [[api-architecture]]
│   ├── loading.tsx         # Suspense fallback (enables streaming)
│   ├── error.tsx           # Route-segment error boundary
│   ├── not-found.tsx       # 404 page
│   ├── robots.ts           # → /robots.txt
│   ├── sitemap.ts          # → /sitemap.xml
│   ├── globals.css         # Tailwind v4 config + design tokens
│   └── favicon.ico
│
├── views/                  # Page-level components — one per route
│   └── home/
│       ├── index.tsx       # HomeView (Server Component; does the bot check)
│       └── sections/
│           ├── hero/       # The GRIDO1 hero, from Figma 823:247
│           │   ├── index.tsx           # composition + responsive layout
│           │   ├── hero-nav.tsx        # masthead
│           │   ├── hero-loader.tsx     # prewarm veil + handover
│           │   ├── driver-identity.tsx # name, number, meta rows
│           │   ├── bracket-panel.tsx   # the corner-bracket frame
│           │   ├── driver-panels.tsx   # next race + season stats
│           │   └── hero-actions.tsx    # trailer, profile CTA, socials
│           └── hero-scene/ # The three.js effect behind it
│               ├── index.tsx   # React wrapper (ticker, pointer, resize)
│               ├── scene.ts    # the scene itself
│               ├── device.ts   # tier: DPR, fps, pointer, mask cost, wireframe, reveal, freeze — re-read on width change
│               └── controls.tsx # dev-only tuning panel
│
├── layouts/                # Reusable layout wrappers
│   └── scroll-layout.tsx   # Lenis smooth-scroll wrapper
│
├── components/
│   ├── ui/                 # Design-system primitives (Button, Input…) — empty, add as needed
│   ├── common/             # Shared infrastructure (Cookie, grid, ReducedMotion, Skeletons)
│   └── animation/springs/  # ⚠️ Animation engine — #do-not-modify
│
├── hooks/                  # Custom hooks, grouped by domain
│   ├── animation/          # ⚠️ Animation hooks — #do-not-modify
│   ├── smooth-scroll/      # useScroll Zustand store
│   └── use-window-size.ts
│
├── lib/                    # Third-party client init / global config
│   ├── animation/ticker.ts # Shared app-wide requestAnimationFrame loop
│   ├── api/                # API route-handler helpers (handle, ApiError)
│   ├── api-client.ts       # Typed same-origin /api fetch wrapper (client)
│   ├── site.ts             # Site-wide SEO config (single source of truth)
│   └── springs/config.ts   # Global animation config
│
├── utils/                  # Pure utility functions (no side effects)
│   ├── animation/coords.ts
│   ├── seo/generate-page-metadata.ts · seo/structured-data.ts
│   ├── is-bot.ts · lvh.ts · math.ts · scroll-to.ts
│
├── types/                  # Shared TypeScript types
│   └── springs.ts
│
└── style/                  # Extra CSS layers imported into globals.css
    └── index.css
```

## `public/` — static assets

```
public/
├── favicon.ico, *-icon-*.png, manifest.json, browserconfig.xml, open-graph.png
│                            # site-level meta / PWA / SEO assets — stay at the root
└── assets/                  # site content assets (images, video, …)
    └── <section>/           # one folder per section that uses them
```

> [!important] Asset convention
> Content assets used **on the site** (images, videos, …) live under
> `public/assets/`, and **each section gets its own folder** — e.g.
> `public/assets/hero/`, `public/assets/footer/`. Reference them by absolute
> path (`/assets/hero/bg.webp`). Meta/PWA/SEO assets (favicons, icons,
> `manifest.json`, `open-graph.png`) stay at the `public/` root.

The hero splits its folder in two: `public/assets/hero/ui/` holds the flat
Figma exports (logo, flags, circuit, corner/CTA vectors, backdrop lines) and
`public/assets/hero/scene/` holds everything the three.js scene loads —
models, HDRI, Draco decoder, and the texture maps.

Several of those maps are **build outputs**: regenerate them with the
`scripts/` above rather than editing the `.webp` files by hand.

| Generated | From | By |
|-----------|------|----|
| `person-{diffuse,alpha,depth,normal}.webp` | `person.png` | `generate-person-maps.mjs` |
| `helmet-carbon-basecolor.webp` | `helmet-gold-basecolor.webp` | `recolor-helmet.mjs` |
| `glass-neutral-basecolor.webp` | `glass-basecolor.webp` | `recolor-helmet.mjs` |
| `assets/hero/ui/helmet-mask.png` | `helmet.png` | `recolor-helmet.mjs` |
| `open-graph.png`, `favicon-*`, `android-icon-*`, `apple-icon-*`, `src/app/favicon.ico` | hero assets | `generate-open-graph.mjs` |

The two `*-basecolor` originals are kept — they are the inputs, and the
de-branding is a transform over them, not a replacement. `person.png` and
`helmet.png` sit untracked at the repo root.

> [!warning] The helmet atlases are no longer loaded (2026-09-07)
> `helmet3.glb` — the model that ships — carries its own baked base colour,
> normal and metallic-roughness,
> so `scene.ts` fetches no helmet texture at all — every `helmet-*` and
> `glass-*` map here, generated and original alike, is now unreferenced, and so
> is `helmet.glb`. (A `helmet2.glb` was a first cut of the same export and is
> not committed — `helmet3.glb` superseded it before either was pushed.) The
> unreferenced maps are left on disk rather than deleted: `public/` is
> served per-request, so an unused file costs nothing at runtime, and they are
> the record behind [[decisions-log]] ADR-0022. `recolor-helmet.mjs` still runs
> and still emits `helmet-mask.png`, which the **loader** uses and which is
> unaffected. See ADR-0027.

## Placement rules — where do I put a new file?

| I am adding… | It goes in… |
|--------------|-------------|
| A route | `app/<route>/page.tsx` — 3 lines, delegates to a view |
| An API endpoint | `app/api/<resource>/route.ts` — see [[api-architecture]] |
| A page's UI | `views/<page-name>.tsx` — see [[new-page]] |
| A reusable design primitive | `components/ui/` |
| Shared infra (provider-dependent) | `components/common/` |
| A feature-specific component | next to the feature, **not** in `components/` |
| A custom hook | `hooks/<domain>/` |
| A pure helper | `utils/<domain>/` |
| A shared type | `types/` |
| Mock/placeholder data | `src/data/mocks/<page-name>.ts` (create folder as needed) |
| A third-party client init | `lib/` |
| A site content asset (image, video) | `public/assets/<section>/` — one folder per section |
| A favicon / icon / OG / manifest asset | `public/` root |

## Do-not-modify zones

`components/animation/springs/` and `hooks/animation/` are the animation engine.
Treat them as a vendored library — consume them, never edit them. See [[animation-system]].

## Related

[[system-overview]] · [[component-conventions]] · [[routing]]
