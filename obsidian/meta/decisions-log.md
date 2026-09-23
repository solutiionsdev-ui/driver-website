---
tags: [meta, decision]
updated: 2026-09-08
---

# Decisions Log (ADRs)

Architecture Decision Records. Each entry captures a choice, its context, and its
consequences. Use [[templates/adr-note]] for new entries. Newest first.

---

## ADR-0030 — Touch tiers run at 60 and pay for it in draws, not pixels; the tier is re-read on every width change

- **Status:** Accepted
- **Date:** 2026-09-08
- **Supersedes** point 6 of ADR-0023 (resize gated on `coarsePointer`).

**Context.** The hero was reported as lagging on phones and in Chrome's device
emulator alike. The mobile tier already drew at DPR 1 — 329k fragments on a
390×844 screen against ~2.9M on a desktop — so under emulation on a desktop
GPU the cost could not have been fill. It was the **frame cap**: 1000/30,
which the shared ticker turns into 26fps, chosen on the skill's argument that
a slowly evolving field cannot show a halved rate. Nothing in this scene
evolves slowly: the idle sweep is a 0.45s stroke, the entrance is a burn, and
the helmet tilts with the pointer. All three stepped at 26.

Separately, a viewport that changed class mid-session was never followed. The
resize path had been switched off wholesale on coarse-pointer devices so that
the iOS URL bar could not rebuild the framebuffer mid-scroll — and so a page
opened under an emulator, or a tablet docked to a keyboard, kept a phone's
canvas, budget, parked pointer and hidden wireframe for the rest of the
session.

**Decision.**

1. **Touch tiers cap at 60, not 30/45.** `1000/60 − 2`, because the ticker
   skips while `time − last <= framerate`: an exact 1000/60 lets a 60Hz screen
   through on float noise and puts a 120Hz screen at 40; two under gives 60
   and every-second-tick respectively. Desktop stays uncapped.
2. **The frame is paid for elsewhere, in work that was invisible.** The
   backdrop's reveal loop ran over every fragment of a full-screen plane on
   touch widths only to be multiplied by a zero `bgRevealOpacity` — a uniform
   branch skips it outright. The scanning wireframe — 113k line segments over
   a helmet ~300px wide, mostly sub-pixel, the binning-bound case for a
   tile-based GPU, for a wave that peaks at 9% opacity — is **not drawn on
   the mobile tier** (`SceneTier.outline`). It is still built and compiled in
   the prewarm, so a tier change can show it without a mid-session compile.
   The portrait's 2048² maps get a mip chain; they were sampled from the top
   level at 7× minification, which is the texture-thrash case §12 describes.
3. **DPR caps stay 1 / 1.25 / 1.5.** The request was "1 to 1.5", which is
   what was already shipped; a phone was never at its native 3×.
4. **The tier is re-read on every width change, on every tier**, and on a
   flip of the pointer-class media query. Only a **height-only** change on a
   coarse pointer is ignored — that is the URL bar, and the only thing the
   old gate was actually protecting. `retune()` returns the tier and applies
   all of it that is not baked: DPR, budget, wireframe, pointer parking, and
   it un-freezes a scene that a saver phone had settled. The React wrapper
   binds and unbinds the pointer listener to follow. `antialias` (the GL
   context) and `trailSamples` (shader source) are carried over from the tier
   the scene was built under, so the tier object always describes what is
   drawn.
5. **The reveal itself is off on the mobile tier** (`SceneTier.reveal`,
   added later the same day at the owner's request). With no cursor, touch
   ran the reveal through the idle sweep — a stroke every five seconds whose
   warp and capsule loop were the only per-fragment work in the frame that
   never rested. The sweep is zeroed from `applyFit` and the parked-cursor
   fallback that kept the helmet from vanishing is gated off, so after the
   entrance burn the helmet stays dissolved and the portrait stands alone.
   The burn is kept: it is the loader's handover and it plays once.

**Consequences.**

- Phones show the helmet only during the entrance. The look after it is the
  portrait with the animated contours behind — the effect that read as the
  block's signature on desktop is a desktop effect now, by decision.
- Phones lose the wireframe scan. At that size it read as a grey shimmer, and
  the reveal, the burn and the tilt — the effects that carry the block — now
  run at 60 instead of 26.
- Draws per frame on a phone: **4 → 3**. Programs stay at 6 across a tier
  switch in either direction (measured over CDP), so §3's prewarm still holds.
- A desktop window narrowed to phone width will hide the wireframe and cap at
  60, and get both back when widened — the tier is a viewport class, and the
  scene follows it live.
- **Unmeasured on hardware.** The counted quantities are from headless Chrome;
  the frame-rate and fill arguments are arithmetic. A real phone is the next
  check, and the wireframe decision is the one to revisit if it shows headroom.

---

## ADR-0029 — The helmet's cursor rotation is an amplitude in degrees, per axis

- **Status:** Accepted
- **Date:** 2026-09-08

**Context.** The hero helmet turns with the cursor about two axes. Until now
each axis was a **gain** on the pointer (`helmetRotX`, `helmetRotY`), and the
pitch additionally ran its input through a saturating cap (`tiltLimit`). The
angle a reader saw was therefore `gain × cap` radians for the pitch and
`gain × 1` for the yaw — nothing on the panel read as "how far it turns", the
two pitch knobs were coupled (moving either changed both the amplitude and the
shape), and with the gain at its slider's floor there was no way to ask for a
larger swing without loosening a cap that was meant as a shape control. The
owner asked for a control over the amplitude of each axis.

**Decision.** Per axis, two independent numbers: the **amplitude** in degrees
— the angle at the edge of the window, signed, so the sign is the direction —
and a **curve**, the shape between centre and edge. The curve is normalised,
`amp · tanh(c·v) / tanh(c)`, so it reaches exactly the amplitude at `|v| = 1`
for every `c`, and `c = 0` is a straight line. `swing()` in `scene.ts` is the
whole of it. The old three params are removed rather than kept alongside: a
third multiplier on the same axis is a redundant knob, and the point was to
have one that reads.

**Consequences.**

- **Amplitude and shape no longer interact.** Drag the amplitude and the edge
  angle moves; drag the curve and only the path there changes. The old pair
  could not do either on its own.
- **Both axes are the same instrument**, including the yaw's second filter,
  which it previously went without because its swing was under a degree. An
  amplitude on a slider can be raised to match the pitch, so it needs the same
  weight or it lurches.
- **The shipped look is preserved**: `−1 × 0.15 rad` restates as −8.6° at
  curve 6.67 (= 1/0.15), the yaw as 0.86° at curve 0 — identical to four
  decimals across the sweep.
- The stored dev-panel blob invalidated itself through ADR-0028's fingerprint,
  because the key set changed. First time a rename has been covered by it.
- `tanh`, not a clamp, for the same reason as before: a clamp leaves a corner
  where the turn stops dead, exactly where a cursor crossing the frame moves
  fastest.

---

## ADR-0028 — Stored dev-panel params lose to a retuned default, automatically

- **Status:** Accepted
- **Date:** 2026-09-07

**Context.** The hero's tuning panel persists its params to `localStorage`
(development only — `PERSIST_PARAMS`), and `readStoredParams` merges the stored
values **over** `DEFAULT_PARAMS`. That ordering is what makes the rig useful: a
tuned look survives a reload. It is also a trap, because it means a stored blob
silently shadows the shipped defaults forever on any machine that has once
touched a slider.

It has now cost real time twice. The key was already bumped `v1` → `v2` when
the idle sweep was switched off, for exactly this. On 2026-09-07 it happened
again on the helmet tilt: `helmetRotX` and `tiltLimit` were retuned across four
rounds while the running page held **−0.01 / 0.15** out of storage against a
source that said **−0.22 / 0.25**. Every edit landed and none of it reached the
screen.

**The failure mode is what makes this worth a decision, not just a bump.** The
symptom is "nothing changed", which is indistinguishable from a broken edit, so
the investigation goes to the code under test — the maths, the wiring, the
render path — and not to the storage that is quietly overriding it. A remedy
that requires suspecting the bug is not a remedy; it is a second chance to lose
the same afternoon.

**Decision.** The stored blob carries a **fingerprint of the defaults it was
written against** — `__defaults`, a reserved key `readStoredParams` skips when
merging, since it only reads keys `DEFAULT_PARAMS` declares. On read, a
mismatch drops the blob and returns the defaults. Retuning any default
therefore self-invalidates stale storage everywhere, with no one having to
notice. `PARAMS_STORAGE_KEY` was bumped to `:v3` in the same change to clear
blobs written before the fingerprint existed; it should not need bumping by
hand again.

**Consequences.**

- **A developer's local tuning is discarded whenever any shipped default
  changes.** That is the trade, and it is the right way round: every stored
  value is one a slider wrote, and none of them is worth shadowing a
  deliberate change to the shipped look. The panel's Copy button is how a
  tuned pass is meant to survive — as JSON the owner keeps, not as a blob that
  outlives the code it was tuned against.
- The fingerprint is the full `key:value` list, not a hash. It is compared
  once on mount, never transmitted, and being readable is worth more than
  being short when the next person is debugging this.
- **Production is untouched.** Persistence is `NODE_ENV === "development"` and
  folds away in a build, so no visitor ever had a shadowing blob — the bug was
  only ever a development-time trap, which is precisely why it survived so
  long unnoticed.
- Verified by corrupting a stamp: the blob is removed on the next load and the
  panel returns to the shipped values.

---

## ADR-0027 — The hero helmet is a supplied GLB with its own baked PBR set

- **Status:** Accepted
- **Date:** 2026-09-07
- **Supersedes:** the open question left by [[decisions-log]] ADR-0022

**Context.** ADR-0022 recorded that the hero wore `helmet.glb` in Lando's yellow
McLaren/Monster livery — "plainly wrong for a Kimi Antonelli frame" — and that
the front-on `helmet.png` could not be turned into a replacement texture. It
listed what *would* work, first item: **a base colour painted into the model's
own UV layout**, obtained from wherever the helmet model came from. The owner
has now supplied exactly that, as a whole model: a Mercedes-AMG Petronas helmet
exported with base colour, normal and metallic-roughness baked into its own UVs
and embedded as WebP (`EXT_texture_webp`), Draco-compressed like the original.
It arrived twice — `helmet2.glb` first, then `helmet3.glb` on 2026-09-07, same
shape of export at roughly a third of the geometry. **`helmet3.glb` is what
ships**; the numbers below are its.

**Decision.** Replace the model and let it keep the material it ships with. The
scene loads `helmet3.glb`, takes the `MeshStandardMaterial` `GLTFLoader` builds
from the glTF PBR block, and adjusts only what the reveal requires. The external
livery atlas is no longer loaded at all. Nothing in `buildHelmet` names the
model or its meshes, so a further revision of the export is a one-line change of
path — which is exactly what the helmet2 → helmet3 swap was.

**Consequences.**

- **The helmet is on-brand for the first time.** The de-brand problem ADR-0022
  spent three revisions on is gone at the source: there are no McLaren, Monster,
  Android or Tezos marks to suppress, so `scripts/recolor-helmet.mjs` and both
  neutralised atlases (`helmet-carbon-basecolor.webp`,
  `glass-neutral-basecolor.webp`) are now dead weight. They are left on disk —
  `public/` is served per-request, so an unreferenced file costs nothing at
  runtime — but nothing reads them and ADR-0022 is now history, not guidance.
- **Six texture requests dropped from the critical path.** The shell and visor
  atlases (`helmet-gold-basecolor` 314 KB, plus normal / roughness / metallic /
  glass base colour / glass roughness, ~478 KB together) are no longer fetched.
  The model carries 637 KB of embedded WebP instead, inside a GLB that grew
  139 KB → 782 KB. Net ≈ +160 KB, in one request rather than seven.
  `noise.webp` still loads — it was never a helmet map; it is the shared
  reveal/burn noise the backdrop reads too.
- **The material tuning is the model's, not ours.** `metalness: 1 /
  roughness: 0.35` existed because the flat de-branded atlas gave the shader no
  per-texel variation to work with. The baked metallic-roughness map now
  supplies that, so only `envMapIntensity: 1.3` is kept as a look decision.
  `helmetBrightness` still multiplies `material.color` for live tuning, and at
  its default of 1 it is a no-op.
- **`FrontSide` is forced over the export's `doubleSided: true`.** The reveal
  needs the shell `transparent` with `depthWrite: false`, and a double-sided
  pass in that state draws the helmet's own back faces through itself — the
  same "loose polygons" failure the entrance burn was fixed for.
- **There is no separate visor any more.** `helmet.glb` split into
  `helmet` / `glass` / `plastic` nodes, matched by name, with the visor given a
  `MeshPhysicalMaterial` at 0.35 opacity and the aero hardware hidden.
  Both supplied exports are one mesh under one material, so the name matching,
  the physical glass material and the `glassOpacity` control are all removed. The
  visor is opaque baked texture now: hovering the reveal over it covers the
  eyes rather than showing them through tinted glass. That is a property of the
  supplied model, not a tuning choice — getting the old behaviour back needs the
  visor split into its own mesh at export time.
- **Geometry ends up lighter than the helmet it replaced: 45,501 → 37,783
  triangles.** It is paid twice, once for the shell and once for the merged
  wireframe the outline wave draws, so the saving counts double. The first
  export (`helmet2.glb`) went the other way at 98,706 and cost nothing
  measurable either — this scene is fill-bound on the full-screen mask
  ([[decisions-log]] ADR-0023), not vertex-bound. Measured on
  `yarn build && yarn start`, desktop, hero on screen: median frame 16.7 ms,
  p95 17.1 ms, max 17.9 ms — a held 60 fps (helmet2 measured 16.7 / 17.5 /
  18.0, i.e. the same). Not re-measured on the mobile tier.
- **Placement still derives from the bounding box**, so nothing was hand-tuned
  across any of the three models: each is normalised to `HEAD_HEIGHT * 0.56` on
  Y and centred, and their proportions are close enough (Y/Z 0.80 for
  `helmet.glb`, 0.79 for `helmet2.glb`, 0.80 for `helmet3.glb`) that every one
  lands in the same framing.

---

## ADR-0026 — The hero scene's render gate is the scroll position, not its own visibility

**Context.** The scene subscribes to the shared ticker through `useLoopInView`,
which stops the loop when an `IntersectionObserver` says the element has left
the viewport. That works for every block on the page except the one it was
written for. The hero is the first layer of `SectionStack`: it is
`position: sticky; top: 0`, the blocks after it scroll over it, and the stack
hides it with `visibility: hidden` only once it is *completely* covered. Its
rect therefore sits in the viewport for the entire page, the observer never
fires, and the scene went on rendering at the tier's full budget while three
other blocks were on screen. Measured: 22.7 fps, three viewports down.

**Decision.** Gate the hero's tick on `document.hidden` and on
`scrollY > innerHeight * 1.15` — a scroll read, no layout — in addition to the
observer.

**Consequences.** The scene costs nothing once it is covered, and comes back
warm on the way up (the 0.15 margin). The number is a page-layout assumption:
it is right because the hero is the first, full-screen layer of the stack, and
it would be wrong if the hero ever stopped being that. Reading the element's
own geometry cannot replace it — that is what the pin destroys — so if the
stack changes, this constant has to change with it.

---

## ADR-0025 — The season circuit is traced raster data, drawn on a canvas from a spring

- **Status:** Accepted
- **Date:** 2026-08-20

**Context.** The "season so far" block needs the circuit to fill like a car
running a lap: progressively, from the chequered flag, clockwise, once on
arrival. Three things stood in the way.

First, the design's circuit is not strokable. The Figma layer (`Vector`,
748×545) is a **closed filled ribbon** — 197 cubics with `fill="#02D2E3"` and
no `stroke`. SVG can animate a stroke's `dashoffset` along a path; it has no
equivalent for "fill this shape up to here along its length". Deriving a
centreline from the outline was tried and failed: the two sides of the ribbon
do not correspond point-for-point, and the reconstructed line left a 273px gap
between its start and end and put the flag 260px off its mark.

Second, the effect on the leading edge is a **shader idea** — bright faces
crossing a threshold into ASCII — and the block has no 3D scene to hang a
render pass on.

Third, the block is below the fold, so whatever drives the animation has to
still be alive when the block finally arrives.

**Decision.**

1. **The path is data recovered from the raster.** The frame's white line was
   thresholded to a mask, thinned to a single pixel with Zhang-Suen, walked as
   one chain and resampled to a fixed 3-unit step — 900 points, 2688 units,
   start and finish at the flag. It lives in `season/circuit-path.ts` in a
   1440×800 authoring space, and the backdrop is cover-fitted in that same
   space so the two can never drift apart.
2. **The ASCII pass is a second, low-resolution canvas.** The same trail is
   drawn at one pixel per glyph cell, which buys a whole-frame luminance
   reading for one `getImageData`; cells above the threshold are punched out of
   the smooth line and re-set as glyphs. The threshold defaults to 0.68 — the
   gap between the accent's 0.587 luminance and the white head's ~0.88.
3. **Motion is a `@react-spring/web` spring, and the canvas draws from its
   `onChange`.** An in-view render loop was tried first and stalled the lap
   partway through: the shared ticker sleeps a subscriber ten frames after its
   element leaves the viewport, and this block is out of view for the whole of
   the page's first paint.
4. **The chain is closed in the data, and the head cools in a second spring.**
   The walk leaves the centreline 20 units short of its own start, right at the
   flag; those units are bridged at the same step so the lap closes. And the
   distance the head is placed at comes from the cumulative array this module
   builds, not from the rounded `CIRCUIT_LENGTH` — a total half a unit out
   would reopen the same seam. Once the lap rests, a second spring walks the
   tip's colour back to the body's over 800ms, so the block's resting state is
   a closed cyan lap and not a lit tip parked on the finish line.
5. **The lap is paced by the path's own curvature.** Constant speed read as a
   fuse burning. The turn angle at each point, smoothed over its neighbours,
   becomes a speed; each segment's duration is its length over that speed; the
   spring then runs 0-1 in *time* and a binary search turns that back into a
   distance. The car brakes for the corners and runs away down the straights.

6. **The map became vector, and the lap fills the designer's ribbon.** Once
   the designer supplied the Figma path, tracing stopped being necessary: the
   circuit is their filled ribbon, and the lap is revealed by masking it with
   the centreline stroked wide and dash-offset animated. That is strictly
   better than the canvas stroke it replaced — the fill carries the designed
   width at every point. The mask rides the same `distanceAtTime` curve as the
   canvas head, so the two cannot drift; it is driven by an exact polyline
   length rather than `pathLength`, which not every renderer honours.
7. **The halftone stays a raster — now an SVG one.** Extracting the map's 6,862 dots to a point
   field was tried and reverted — see [[components/sections]]. Lifting geometry
   out of the raster is worth it when the geometry has to *move* (the circuit)
   or *stack* (the flag). The dots do neither, and a drawn approximation of a
   halftone loses to the halftone.

**Consequences.** The trace is exact where it matters — it starts and ends on
the flag and sits on the map at every width — at the cost of 16KB of point data
in the bundle. The ASCII pass is O(cells), 144×80 at the default glyph size, so
it is not a hot loop. Because the spring drives the frames, `ReducedMotion`
(ADR-0014) makes the block jump straight to the finished lap for free, and no
work happens outside the four seconds the lap is actually running.

The parameters the effect was tuned on — 4s lap, 5.5-unit line, 0.68 threshold,
10-unit glyph, 150-unit edge — are module constants in `season-circuit.tsx`,
not props. They were tuned once against the design and are not per-instance
settings; the tuning rig that produced them was the artifact, not the app.

## ADR-0024 — Below `xl` the type scale holds; the overlay layout starts at 1280

- **Status:** Accepted
- **Date:** 2026-08-19

**Context.** Two adaptation faults showed up when the hero was swept across
breakpoints.

First, the scaling grid was discontinuous. Its ranges map a viewport
`maxWidth` to the design `baseWidth` it was drawn at, and the phone range was
`{ maxWidth: 640, baseWidth: 360 }` — it *reached up to 640 while being based
at 360*. So at 641px the `≤1024` rule resolved the root to **10.0px** (nav
text at 10px, unreadable), and one pixel lower the phone rule took over at
**28.4px** — a 184% jump on a single pixel of width.

Second, the desktop overlay composition is drawn at 1440 and only works
there. The subject in the WebGL scene is sized by the *canvas height* (the
camera's vertical FOV is fixed), while the text columns are sized by *width*.
At 1024×768 the two diverge far enough that the portrait crossed into the
headline — `ANTONELLI` sat behind the face, `driver_012` was hidden entirely,
and the footer row collapsed onto itself.

**Decision.** Below `xl` (≤1279px) the root font-size holds at `FONT_BASE`
(16px) and the layout is the stacked adaptation; the `lg` range no longer
switches to the overlay. From 1280px up the overlay composition applies and
scales proportionally to 1440 exactly as before. The headline keeps its
designed `--type-impact` from `lg` up, so the wide half of the stacked range
does not read as under-scaled.

**Consequences.** Both anchors are preserved exactly — the sub-`xl` range
already resolved to 16px at 1024 and at 360, and **1440 is untouched**
(verified: root 16px, headline 96px, canvas 860px, identity column 417px).
The 640/641 cliff is gone. The 1024–1279 band trades the designed overlay for
a stacked layout that actually fits; regaining the overlay there would mean
driving the scene's subject scale from viewport width instead of height,
which is a scene-level change and deliberately out of scope here.
`grid.config.ts` gains `baseWidth: null` to express a non-scaling range.

---

## ADR-0022 — A front-on helmet photo cannot become a helmet texture

- **Status:** Superseded by [[decisions-log]] ADR-0027 (2026-09-07) — the owner
  supplied a whole model (`helmet3.glb`) carrying the UV-mapped base colour this
  ADR said was the only input that would work. Kept as the record of what a
  photo-to-atlas re-skin costs and why it was refused.
- **Date:** 2026-08-04

**Context.** `helmet.png` (397×265, front-on product shot of the Mercedes
helmet) was supplied to re-skin the 3D helmet, whose base colour is currently
Lando's yellow Monster livery — plainly wrong for a Kimi Antonelli frame.

**Decision.** The photo is **not** convertible, for three independent reasons,
and the shell is recoloured to match it instead.

1. `helmet-gold-basecolor.webp` is a **UV atlas** — the flattened shells of
   `helmet.glb`, laid out in the model's own UV space. Texturing needs a
   value for every texel of that layout. A single front view carries no
   sides, no back, no top, and no way to know where in the atlas the pixels
   it *does* carry belong.
2. Resolution is off by ~5×: the atlas is 2048², the photo 397 px wide, and
   the helmet occupies ~500 px of screen.
3. Front-projecting the photo would only texture the front-facing polygons
   and smear that colour along every surface turning away from camera.

**What would work**, in descending order of quality:
- A **2048² base colour painted into `helmet.glb`'s UV layout** — the only
  input that maps correctly. Export the UV layout from the GLB and paint into
  it, or get the livery atlas from wherever the helmet model came from.
- Orthographic front/back/left/right/top renders at ≥2K, projection-baked to
  the UV layout in Blender. A manual bake, not something derivable in-repo.
- A higher-resolution cut-out (≥1500 px) if the helmet should instead become
  a **flat photographic plane** like the portrait — the design composites it
  over the face, so this is viable, but at 397 px it would be visibly soft.

> [!important] The de-branded atlases are built but **not currently used**
> The owner reverted the scene to the original livery (2026-08-04) pending a
> proper replacement texture. `scripts/recolor-helmet.mjs` still emits
> `helmet-carbon-basecolor.webp` and `glass-neutral-basecolor.webp`; swapping
> the two `loadTexture` lines in `scene.ts` brings them back, along with the
> flat-grey material tuning noted below. Everything in this ADR still holds —
> it is the record of what a de-brand costs and why both atlases need one.

**Consequences.** `scripts/recolor-helmet.mjs` maps the atlas onto a narrow
graphite ramp sampled from the photo's dominant buckets. The ramp is tiny
(~20 levels) because the shell is a metal: base colour tints its environment
reflection, so a 2× difference is a 2× brightness difference and the sponsor
wordmarks came back as legible decals at any wider range. Surface interest
comes from the normal and roughness maps, which the script never touches.
The livery's *shapes* are gone but its logos are only suppressed, not
removed — a real re-skin still needs a real atlas.

**Revised again 2026-08-04 (second pass)** — the entrance burn shows the
helmet **whole and unmasked**, which removed the cover the earlier recolours
had been relying on:

- The shell atlas is now **completely flat** — all four ramp constants equal.
  Every narrow-but-nonzero ramp left "Android", "FAI" and the Monster
  wordmarks legible, because a metal's base colour tints its reflection and
  so any contrast is amplified rather than lit. Uniform is the only value
  that works. The normal and roughness maps still carry every scratch and
  panel line, so the helmet does not look like flat plastic.
- **The visor was the loudest offender and had never been touched.**
  `glass-basecolor.webp` is a separate atlas carrying "McLaren", "Tezos" and
  "android" in full colour on the brow strip; flattening the shell did
  nothing to it. `neutraliseGlass()` now pushes anything bright *or*
  saturated to the frame's black. Saturation alone is not enough to find the
  logos — the white logo text is as achromatic as the grey ground, so
  luminance is what separates them.
- Anyone re-skinning this helmet must handle **both** atlases.

**Revised 2026-08-04** — the owner asked for grey rather than near-black. The
ramp moved up to `0x56`–`0x6b`, keeping its narrow span so the decals stay
suppressed. The material had to move with it: `metalness 0.95 / roughness
0.16 / envMapIntensity 2.4` existed to stop a near-black shell reading as a
hole, and those same values blow out a light one, so it is now `0.72 / 0.22 /
1.35` — grey lacquer, not chrome. `helmetBrightness` multiplies the map via
`material.color` for live tuning without re-running the script; note it
scales the decal contrast along with everything else, so pushing it far above
1 brings the wordmarks back.

---

## ADR-0023 — Scene performance is tiered through one module, and the mask's cost is its loop bound

- **Status:** Accepted
- **Date:** 2026-08-04

**Context.** A performance pass under the `optimize-3d-scene` skill. The scene
had grown two full-screen mask evaluations per frame (cursor + sweep) on top of
a helmet, a wireframe wave and a backdrop, and `device.ts` still only knew
"mobile or not".

**Decision.**

1. **One tier module owns every budget.** `device.ts` now returns a named tier
   (mobile / tablet / desktop) plus DPR, frame interval, antialias, pointer,
   **`trailSamples`** and a `freeze` flag combining reduced motion with an
   energy-saver proxy (`saveData`, `deviceMemory ≤ 2` — the nearest web-exposed
   stand-in for iOS Low Power Mode, which has no API). Read at construction —
   and, on pointer-having devices only, re-read on resize; see point 6.
2. **The reveal's sample count is the scene's main fill lever, and it is
   per-tier** — 28 / 44 / 72. It is a per-fragment loop bound over a
   full-screen plane, run twice, so every sample is paid across the frame.
   Because it also sizes a uniform array, it **cannot be a uniform**: the
   shader source is built at construction from the tier. This supersedes the
   note in ADR-0021 that said changing it required a rebuild.
3. **Gate before bounds in the mask.** Below the pace gate a trail contributes
   nothing, so returning early there skips the entire loop for whichever trail
   is resting. Ordering matters — the bounds test alone still ran the loop for
   a still cursor sitting inside its own box.
4. **DPR stays at 1.0 on mobile**, against the skill's 0.85 default. The
   backdrop contours and helmet wireframe are hard-edged, and §6's own
   exception says not to go below 1.0 for those.

5. **The mask's loop carries three exact early exits**, all of which leave
   every pixel identical. A link's contribution is bounded by its `weight`,
   and `weight` falls monotonically with age — so once it reaches the running
   maximum, nothing later can beat it and the loop stops. Past
   `threshold + edge` the final smoothstep saturates, so a larger value is
   indistinguishable. And `revealTrail` short-circuits rather than taking a
   `max()`, so where the cursor already reveals fully the sweep's whole loop
   is skipped — precisely the overlap region that made two simultaneous
   reveals expensive. **Anything added to this loop must preserve the
   monotonic-weight property**, or the first exit becomes wrong rather than
   merely conservative.

   The two trails are also **tuned separately** (`sweepWarp` / `sweepLength`
   against `revealWarp` / `trailLength`). They cost differently: the cursor's
   loop only runs while someone is moving the pointer, the sweep's runs
   forever. Making the always-on one shorter and less warped is close to free
   visually and is the cheapest saving available here. Note the bounding box
   is derived from whichever pair the trail uses — it has to match the loop it
   guards, or it either clips the mask or stops rejecting anything.

6. **The tier is re-read on container resize, on pointer-having devices
   only.** The skill says read the tier once and never rebuild — that rule is
   about a *device* not changing class mid-session, which holds. A desktop
   window dragged across a breakpoint genuinely does change class, and gating
   the resize handler on `tier.mobile` meant a window that merely *started*
   narrow was classed mobile forever and never resized at all. Gate on
   `coarsePointer` instead: the iOS URL-bar hazard the original rule guards
   against belongs to touch devices, not to narrow windows. Observe the
   **container**, not the window — the container is what changes at the
   breakpoint, when the layer moves from an in-flow band to a full-bleed
   backdrop. `retune()` applies DPR and frame budget live; **`trailSamples`
   does not update**, because it is baked into the shader source and
   honouring it would mean recompiling every material mid-session.
   **Superseded by ADR-0030 (2026-09-08):** the `coarsePointer` gate left a
   device emulator switched off, and a docked tablet, on a phone's tier for
   the session. The observer now runs everywhere and ignores only
   height-only changes on a coarse pointer.

**Consequences.** Measured on a production build: a crawler now receives
**640 KB** of JS against a human's **1332 KB**, and links **zero** shader
programs. Programs are **stable at 8** across sustained interaction, so §3's
prewarm is complete and there are no mid-interaction compile stalls. No
horizontal overflow at any width from 360 to 1920.

**Not measured:** absolute frame rate. Headless Chrome runs SwiftShader, where
fps is meaningless (§0) — only counted quantities above transfer. A real phone
still needs a look before this is called done.

**Also not measured:** the effect of the three loop early-exits, in
iterations. They are provable rather than measured — each is a bound the loop
cannot cross — but the actual saving depends on where the cursor is, and
SwiftShader cannot show it.

---

## ADR-0021 — Reveal is a cursor path, and the mask history lives on the CPU

- **Status:** Accepted
- **Date:** 2026-08-04

**Context.** The helmet reveal was a radial falloff around the pointer warped
by noise. Against the reference implementation it read as a lamp following the
mouse rather than liquid metal. The reference (`lando.OFF+BRAND…js`) masks the
helmet with a **cursor fluid-trail** rendered to a texture and thresholded
hard (`step(0.1, …)`), and separately runs a **wireframe scan** —
`pow(fract(-vPosition.y * 10. - uTime), 4.)` — over the helmet's geometry.

**Decision.** Adopt both, but build the trail from a **CPU-side pointer
history passed as a `vec2[]` uniform**, not a render target.

The first implementation was a faithful two-target ping-pong. It blanked the
entire scene: ANGLE reported `GL_INVALID_OPERATION: Feedback loop formed
between Framebuffer and active Texture` every frame and dropped the draws. A
render target that main-scene materials sample can still be bound to a texture
unit when a later frame renders into it — three never unbinds — so the
ping-pong is only safe if nothing else holds a reference, which the helmet
materials necessarily do. Symptom to recognise: the head plane disappears too,
because its alpha is gated on `uReveal`, which never ramps.

`TRAIL_SAMPLES = 24` positions (~0.4 s at the desktop tick) are swept as
capsules in the fragment shader, weighted by age. This removes a full pass,
cannot feed back, and gives exact control over the tail via `trailTaper`.

**Consequences.**
- Params changed: `revealRadius/revealWarp1/revealWarp2` →
  `trailRadius/trailTaper/revealThreshold/revealEdge/revealWarp`.
  `pointerLerp` rose 0.035 → 0.12; a trail needs to keep up with the cursor.
- The scan is a merged wireframe of the helmet geometry parented to
  `helmetGroup`, so it inherits every transform. **Full triangle wireframe,
  not `EdgesGeometry`** — the shell is a smooth dome, and a 16° crease
  threshold threw the silhouette away and left only the visor brim floating.
  Density is controlled by opacity (`outlineBase 0.016`, peak `0.11`); higher
  values collapse the overlapping lines into a solid grey mass.
- The per-fragment loop is bounded by a compile-time `#define`, so the cost is
  fixed and the helmet covers a small share of the screen.

**Refined 2026-08-04**, after the owner compared it against the live reference:

- **The outline is a wave, and it is the only thing that draws the helmet.**
  `outlineBase` defaults to 0 — nothing is visible until the wave arrives. The
  band is a **gaussian**, not the reference's `pow(fract(...), 4.)`: that form
  is a sawtooth that snaps from full to nothing at the wrap, which reads as a
  hard scan line. Centring a gaussian and starting it above the crown /
  ending it below the chin means the fade in and out *are* the wave's own
  tails, so there is no discontinuity to disguise. It crosses in ~0.75 s and
  leaves the helmet clear for the rest of the 2 s cycle.
- **Pointer speed drives the reveal's shape** — the reference eases a
  `pace` off the cursor (`createEasedPace`) and we do the same. It rises fast
  (0.25) and falls slowly (0.045) so the trail swells the instant the cursor
  moves and relaxes gradually instead of flickering on jitter. Pace scales
  both the brush radius and the age falloff, which is what makes a slow
  cursor a small blob and a fast one a long trail — a single fixed radius
  gave a circle at every speed.
- **`revealWarp` displaces the sample position, not the accumulated value.**
  Warping the value only shifts the threshold and leaves the silhouette a
  clean disc; warping the point being measured bends the shape itself, so a
  parked cursor still kneads its own outline.
- **The reveal is gated on pace, not on the trail's strength.** A resting
  cursor must show no helmet. The trail under a still pointer is perfectly
  strong — it simply is not moving — so thresholding its *value* would never
  hide it. `smoothstep(paceThreshold, +paceRamp, pace)` multiplies the mask
  instead. **Touch tiers pin `pace` to 1**: with no cursor to measure, the
  gate would otherwise hide the helmet permanently, and those tiers rely on
  the static pose to reproduce the design.
- **Everything the effect keys off is a `HeroSceneParams` entry**, not a
  module constant. The taper/radius pace ranges, the pace easing, the noise
  frequency and the shell's brightness were all tuned by eye against a live
  reference; a constant that needs eyeballing belongs on a slider. The one
  exception is `TRAIL_SAMPLES`, which sizes a uniform array and a loop bound
  and so must stay compile-time — `trailLength` scales how much of it
  contributes instead.
- **The dev panel is portalled to `<body>`.** It renders inside the scene
  layer, which the hero gives `z-0` so the rails paint over the canvas — that
  is a stacking context, and no z-index from within it can beat the rails'
  `z-20`. Raising the panel's own z-index cannot fix this; escaping the
  context is the only thing that survives future layout changes.
  It also carries **`data-lenis-prevent`**: Lenis listens for wheel on the
  window and preventDefaults it, so a nested `overflow-y-auto` never receives
  one and simply will not scroll. The portal does not help — the listener is
  global, not a DOM ancestor. **Every fixed overlay in this project that owns
  a scroll area needs that attribute**, and it is not a `z-index` problem
  however much it looks like one.

**Extended 2026-08-04** — the reveal now covers the backdrop as well:

- **One mask, two surfaces.** The grey backdrop reveal and the helmet reveal
  are the same `revealTrail` call, evaluated from clip-space NDC on both the
  backdrop plane and the helmet materials. Same code + same space ⇒ the same
  shape for the same screen pixel, which is what lets the grey meet the
  helmet exactly at the silhouette. The GLSL lives in one
  `revealDeclarations` string for that reason; two copies would drift.
- **The backdrop is procedural, replacing the circuit `LineSegments`.**
  `LineBasicMaterial.linewidth` is ignored by every WebGL backend, so the
  request for thicker lines was unachievable with them short of fat-line
  geometry, and they cost five draws. Contours of a scrolling noise field
  give thickness (`fwidth`-normalised, so the stroke stays constant on screen
  wherever the field flattens) and wave motion as plain uniforms. The Figma
  backdrop SVG was not an option either — it sits behind an opaque canvas and
  has never been visible on desktop.
- **The idle sweep is a second, independent trail** (revised 2026-08-04). It
  was first built to write the real pointer so everything downstream would
  treat it identically — which worked, but meant the two could never coexist:
  moving the mouse suppressed the sweep entirely. Independence was the
  requirement, so it now owns a full copy of the cursor's state and the mask
  is `max(cursorTrail, sweepTrail)`.

  The shader body is **generated per trail** rather than branched, because
  GLSL ES cannot take a uniform array as a function parameter. That doubles a
  per-fragment loop over a full-screen plane, so the gate early-out below
  earns its keep twice over.

  Two details that are not obvious from the effect: the ease is **ease-out
  quad**, not smoothstep — smoothstep eases in as well, which made every
  stroke start apologetically — and the cycle wrap **snaps the entire sweep
  state including its history**, or the smoothing glides from the last
  waypoint back to the first and draws a phantom fourth stroke up the
  diagonal.
- **The original idle sweep drove the real pointer, not a parallel path.** It writes
  `this.pointer` and lets smoothing, pace, the trail and the gate consume it
  exactly as they consume a cursor. Synthesising the *input* rather than the
  *output* is the whole trick: every one of those stages has its own tuning,
  and a second path reproducing them would drift out of step the first time
  any of them was touched.

  It also **repaired touch devices**. The pace gate had shipped with a comment
  claiming those tiers were pinned at full pace; nothing implemented it, so
  `pace` sat at 0 and the gate hid the helmet permanently wherever there was
  no cursor. The sweep supplies the motion those tiers were missing, and pace
  is now measured whenever anything drives the pointer. **The lesson worth
  keeping: the pace gate needs a movement source, so any tier or mode that
  lacks one has to be given one explicitly or the reveal silently disappears.**
- **The headline animates through `TextEngine`, but without `overflow`.**
  Hard rule #1 sends text animation to the engine, and the driver name is the
  only type on the page big enough for a per-word stagger to register. The
  usual `overflow` clip is off, though: the design sets the headline's leading
  at **0.95**, and [[text-engine]] is explicit that clipping below 1.1 shaves
  descenders and accented caps. Rather than loosen the design's leading to
  suit the effect, the words fade and rise instead of sliding out from behind
  a mask — visually near-identical here, and the tight leading survives.
  A `max-w` in `em` keeps the two names on separate lines below `lg`, where
  the rail has no width cap to wrap them.
- **A spring's exit cannot be timed; unmount on its rendered value.** The
  loader veil is a spring, and it was removed on a fixed delay — so it
  disappeared mid-fade at whatever opacity the timer happened to catch. There
  is no delay that suits both a fast and a slow settle, and the project's
  `Spring` (`#do-not-modify`) exposes no `onRest`, so the reliable signal is
  the value the browser is actually rendering: poll `getComputedStyle` while
  exiting and unmount below ~1/255, with a timeout as a backstop because rAF
  pauses in a background tab. **Any future spring-driven overlay that
  unmounts needs this shape**, not a delay guessed from its config.
- **Effects layered over a noisy dissolve must derive from the dissolve, not
  re-sample its input.** The burn's glow was an independent gaussian over the
  same noisy field, with its own width — so at a tight width it lit a
  different scatter of pixels every frame and sparkled instead of sweeping.
  Deriving it from the dissolve's own output (`4·intact·(1−intact)`) pins it
  to the real boundary and bounds its noise by the dissolve's. Related: it was
  also `step()`-gated on `uIntro`, which snapped it off at the end and popped
  — prefer terms that retire because their input reaches zero.
- **The outline and the shell never coexist.** The outline wave is keyed to
  `burnProgress`, so it is absent while the helmet is solid and arrives as the
  burn consumes it. It was written for an invisible helmet — over an opaque
  one it is just a wireframe on paint, and reads as raw polygons through the
  visor. Anything else that discloses the helmet's *form* belongs on the same
  gate; two passes drawing the same geometry at once is what produced both the
  polygons and the contrast flicker reported against the entrance.
- **The subject does not fade in — it is opaque from the first frame.** A
  global `reveal` ramp existed from before there was a loader. Once the loader
  gated on `ready` the ramp became invisible *and* harmful: the shell and
  visor are `transparent` with `depthWrite: false`, so any partial alpha shows
  the helmet's own back faces through itself. Nothing under a full-screen veil
  needs to fade, and the entrance this scene actually has is the burn, which
  requires a solid helmet to start from. **A transparent, depth-write-off
  material has no safe partial-alpha state here** — treat any new global fade
  over the subject as a bug.
- **Screen-space distances stay in pixels and convert per frame.** The
  entrance rise is specified as 300 *CSS pixels*, not world units, because it
  is a piece of screen choreography — it should look like the same movement on
  a laptop and a 4K monitor. The conversion needs the frustum height at the
  subject's depth, which changes with `cameraZ`, so it resolves each frame
  against the canvas' CSS height rather than being baked at construction.
  Same reasoning applies to anything else authored against the layout.
- **The loader gates on `ready`, not on a timer.** The scene already signalled
  readiness after `compileAsync` for the poster fade; the veil reuses it, so
  the first visible frame is a finished one rather than a canvas popping in
  mid-prewarm. Content stays mounted underneath rather than rendering
  conditionally — it is the page's real markup, and neither crawlers nor
  assistive tech should wait on a WebGL prewarm to reach it.
- **The entrance is a burn, and it is why the helmet has no branding left.**
  The sequence is: prewarm → helmet arrives whole and unmasked → dissolve →
  cursor takes over. Showing it whole is the point of the entrance, and it is
  also what forced the full de-brand in ADR-0022 — the mask had been hiding
  what the recolour did not remove. The burn threshold mixes noise with
  height rather than using either alone (noise speckles, height wipes), and
  the front carries a glowing edge, without which the shell only thins out
  and reads as a fade. The clock starts at `ready`, never at construction, so
  it cannot stutter through texture uploads and shader compiles.
- **A bounding box guards the mask loop.** `TRAIL_SAMPLES` rose to 72, and
  the backdrop is full-screen, so the naive cost is 71 iterations on every
  pixel of the frame. `revealTrail` early-returns for fragments outside the
  active trail's bounds (inflated by brush radius and warp reach), and the
  loop `break`s past `uLength`. **Any future full-screen consumer of this
  mask must keep that early-out** — it is the only reason the effect is
  affordable at this history length.

---

## ADR-0020 — Hero scene performance budget & bot gating

- **Status:** Accepted
- **Date:** 2026-07-26

**Context.** The hero scene was reported laggy. Measured on a production build
(counted quantities via a `getContext` hook, per the `optimize-3d-scene`
skill): the scene rendered **9.7 frames/s** — the wrapper passed no `framerate`
to `useLoopInView`, and `useLoop`'s default is **100 ms**, a floor meant for
cheap background loops, not a WebGL scene. Secondary costs: flat DPR cap of 2,
`antialias` + `alpha` everywhere, a full extra helmet draw for the glass
wireframe overlay, `DoubleSide` glass, and no compile/upload prewarm.

**Decision.**

1. **Explicit frame budget per tier**, decided once at construction in the
   feature-local `hero-scene/device.ts`: desktop renders every tick
   (`framerate: 0`), mobile `1000/30`. Never rely on `useLoop`'s default for a
   scene. Tier also owns DPR (mobile 1 / desktop 1.5), `antialias` (desktop
   only), pointer (never attached on touch), and resize (none on touch — iOS
   URL-bar `resize` rebuilds the framebuffer mid-scroll).
2. **Prewarm during the poster** — `initTexture` every texture,
   `compileAsync`, one throwaway render; `ready` (and the poster fade) gates
   on scene-ready, not a timer.
3. **Fill cuts that changed no pixel anyone sees**: opaque canvas
   (`alpha:false`, clear colour read from the page's computed background so
   the brand token remains the single source), wireframe overlay dropped,
   glass front-faces only, `stencil:false`.
4. **Bots get no scene** — server-side `isBot()` in the home view; the scene
   is a `dynamic(ssr:false)` chunk that the bot path never fetches; the
   poster image renders **only on the bot path** — the owner rejected the
   visible poster flash. (Humans originally saw the scene fade in through a
   `reveal` ramp; **that ramp is gone as of 2026-08-04** — a loader now covers
   the wait and the subject is opaque from its first frame. See ADR-0021.)
   **Trade-off accepted:** `headers()` turns `/` from static (`○`)
   into server-rendered (`ƒ`). The page is a single hero; if static
   prerendering ever matters more than bot gating, move the check to
   middleware instead of reverting the gate.
5. **Reduced motion = play the entrance, then freeze** on a settled frame.

**Consequences.** Measured after (same harness, production): **121 scene
frames/s** (display-limited), draws/frame 12 → 8, all 7 program links inside
the loader window, bot path fetches zero scene bytes. The look sacrificed:
no MSAA on mobile (hidden by the DPR clamp and soft imagery), no glass
inner-surface reflections, no wireframe sheen on the dome. Any future scene
must pass its tier's `frameInterval` explicitly and reuse `device.ts` rather
than re-deriving "mobile".

> [!warning] Partly superseded 2026-08-04 — do not "re-apply" cut #3
> ADR-0021 deliberately put a **wireframe draw back**: the outline wave is a
> merged wireframe of the helmet geometry, and it is the whole effect, not a
> sheen. It is not the overlay this ADR dropped — that one was a second full
> pass of the *shell* for a decorative highlight. Deleting the wave as a
> rediscovered fill cost would remove a feature the owner asked for.
>
> Two costs this ADR's measurements predate, both on the reveal path: the
> merged-wireframe draw (+1/frame), and the reveal mask's per-fragment loop —
> which now runs over a *full-screen* backdrop and twice per frame, once per
> trail. The 121 fps figure above was taken before any of that existed.
> **Re-measure before trusting it.**
>
> **Superseded 2026-08-04, ADR-0023:** an earlier revision of this note said
> the loop bound "cannot vary per tier at runtime" and had to be lowered by
> hand and rebuilt. That is no longer true — the shader source is generated at
> construction, so `SceneTier.trailSamples` sets it per tier (28 / 44 / 72).
> Mobile relief is a tier value, not a code edit. Still accurate: shortening
> `trailLength` alone does **not** help, because it only zeroes the weights
> while the loop keeps running.

---

## ADR-0019 — three.js hero scene: plain class + ticker-driven wrapper, no R3F

- **Status:** Accepted
- **Date:** 2026-07-26

**Context.** The reference site's hero is an immersive WebGL scene, and its raw
assets were available (head diffuse/depth/alpha maps, Draco GLBs, PBR textures,
HDRIs). Rebuilding it required a renderer. The obvious choices: adopt
`@react-three/fiber` + `drei`, or use `three` directly. The starter already has
strong opinions that overlap R3F's: one shared rAF loop (`ticker.ts`,
ADR-0009), springs own all animation, and `"use client"` stays at leaves. R3F
brings its own frameloop, its own reconciler, and a second dependency tree —
for a single scene.

**Decision.** Plain `three` in a framework-free `HeroScene` class
(`scene.ts` — init/update/resize/dispose), driven by a thin React wrapper that
subscribes through `useLoopInView`, so rendering rides the app-wide ticker and
stops when the hero leaves the viewport. Scene rules baked in: DPR clamped to
2; `prefers-reduced-motion` zeroes pointer parallax; full geometry / material /
texture / renderer disposal on unmount; the poster image server-renders for
bots and no-JS, fading only when the scene reports ready. The signature
interaction is a **liquid cursor reveal**: the gold helmet is worn on the head
(aligned, tracking the head's parallax) and its `MeshStandardMaterial` gets a
screen-space alpha mask via `onBeforeCompile` — distance from the smoothed
pointer, warped by two octaves of scrolling noise — so the shell is revealed
around the cursor with a liquid edge. (A first pass used world-space clipping
planes to render the helmet as offset slices; it read as broken next to the
reference and was replaced the same day.) Draco decoder vendored under
`public/assets/hero/scene/draco/`.

**Consequences.** `three` (+ types) joins the stack ([[tech-stack]]) and hard
rule #11 now has a live target — any future performance/jank request on this
project must go through the `optimize-3d-scene` skill. A future second scene
should reuse the class-plus-wrapper pattern (and only then reconsider R3F).
Scene motion (lerp easing inside `update()`) is the sanctioned exception to
"springs own all motion": it's per-frame canvas state, not DOM animation, and
it already runs on the shared ticker the spring hooks use.

---

## ADR-0018 — Fixed brand theme for the Lando Norris rebuild (no dark-mode override)

- **Status:** Accepted
- **Date:** 2026-07-26

**Context.** The home page is a rebuild of the landonorris.com home page. That
design is art-directed per section — cream, dark-green, black and lime surfaces
all coexist on the one page — so "light vs dark" is a property of each section,
not of the user's OS preference. The starter shipped a
`prefers-color-scheme: dark` override of the Tier 2 `--background`/`--foreground`
tokens; keeping it would invert the cream hero for dark-mode users and break the
brand look, while the dark sections already carry their own semantic roles
(`--surface-dark`, `--foreground-on-dark`).

Two related choices rode along:

1. **Display font substitution.** The reference site uses the licensed "Brier"
   face (plus Mona Sans). Neither can be redistributed with this repo, so impact
   headings use **Archivo Black** via `next/font/google`, bound as
   `--font-display`; body stays Onest (`--font-sans`).
2. **Palette/type/radius tokens** were sampled from the reference site's own
   `:root` variables and entered through the three-tier convention (ADR-0015):
   `--raw-color-brand-*` primitives → purpose-named roles (`--surface-dark`,
   `--accent`, `--highlight`, `--type-impact`, `--corner-pill`) → `@theme`
   bindings.

**Decision.** Remove the dark-mode Tier 2 override; the brand theme is fixed.
Sections choose their surface via semantic roles instead of a global scheme
flip. The Tier 2 layer remains the themeable seam — a future re-theme is still a
token edit, there is just no OS-driven variant.

**Consequences.** `dark:` utilities and `prefers-color-scheme` overrides are
inert on this project and should not be added per-component. Any new section
picks its surface from the existing roles (`bg-background`, `bg-surface-dark`,
`bg-surface-black`, `bg-surface-muted`/`-soft`) and pairs text with the matching
`text-foreground*` role. If a genuine dark-mode variant is ever wanted, it comes
back as a Tier 2 override block — never `@theme` edits (ADR-0015 rule 3).

---

## ADR-0017 — A skill states its preconditions and its own internal conflicts

- **Status:** Accepted
- **Date:** 2026-07-24

**Context.** `optimize-3d-scene` (ADR-0016) was run for the first time on a real
scene outside this repo — a raw WebGL project, no three.js, no scroll. The fix
order held up; what cost hours was everything the skill left implicit. Ranked by
time burned:

1. **§0 could not be executed at all.** `renderer.info.render` /
   `.programs.length` exist only on `THREE.WebGLRenderer`, yet the skill's own
   title says "three.js / WebGL". The agent had to invent instrumentation before
   it could take a baseline.
2. **The measurement environment was never stated**, and all three failure modes
   fired: dev-mode numbers are invalid (eager chunk serving faked a §1 failure;
   Strict Mode's double-mount faked 2 listeners and a halved frame rate), a
   stale `next start` on the port served 500s that read as a code bug, and
   `waitUntil: "networkidle0"` never fires against `next start`.
3. **§1 actively breaks §3.** `dynamic(ssr: false)` means the scene cannot
   compile until after hydration; on Regular 3G + 4× CPU programs linked at
   5.0 s against a loader that lifted at 2.36 s. Two correct steps, silently
   contradicting each other.
4. **§3's stall list was GPU-only** — all four causes shader/texture/target —
   but the worst stall measured was a 3.9 s main-thread CPU decode. Workers
   appeared nowhere in the skill.

Plus four smaller ones: the `as="fetch"` preload credentials trap (only
`use-credentials` + `include` dedupes; the other pairings silently
double-download), §5's `1000/30` actually measuring ~26 fps because of how the
ticker throttles, §7's "cut the sparse end" having no lever on a *baked* point
buffer, and §13's `lvh` being read as applying to the layout when it is for the
canvas only.

**Decision.** Fold all of it back into the skill, and adopt two rules for how
this and every future skill is written:

- **A step states its preconditions.** §0 now ships a `getContext` hook that
  gives a raw WebGL scene the counted equivalents of `renderer.info`
  (`draws` / `verts` / `links[]` timestamps / captured `attrs`), and a
  *measurement environment* block: production build, kill the old server first,
  `waitUntil: "load"`, and — because SwiftShader is not a GPU — only counted
  quantities transfer, never absolute fps.
- **A step names where it fights another step.** §3 now carries the §1 conflict
  explicitly, with the measurement that exposes it (link timestamps vs handoff
  time) and the fix (preload the data from the HTML; gate the loader on
  scene-ready, not on a duration).

Also added: §3 gains a fifth stall cause (CPU decode → Worker, with
transfer-in-both-directions) and the preload-credentials warning; §5 states the
~26 fps reality; §7 requires a decile ordering check before truncating a baked
buffer; §13 splits canvas `lvh` from content `dvh`; §1's poster is rejustified
(crawler screenshots and the no-WebGL fallback — *not* layout stability) with
two crops for tighter-axis framing and the `headers()` → `○`→`ƒ` prerender
trade-off named.

**Consequences.** The skill now works on a scene with no three.js in it, and its
first section can be executed instead of merely read. The cost is a longer §0 —
an agent must build instrumentation and a production build before touching
anything — which is the correct tax: every number the skill asks for later is
worthless without it. Deliberately kept unchanged, because the field run
confirmed them: the cheapest-first ordering, the canonical-file table, and
"don't invent new shapes; port these" — the `device.ts` port dropped in clean
and is most of why that run went as fast as it did.

---

## ADR-0016 — Skills are registered in the vault, not just dropped in `.claude/`

- **Status:** Accepted
- **Date:** 2026-07-24

**Context.** The first Claude Code skill for this starter —
`optimize-3d-scene` — arrived as a folder under `.claude/skills/`. A skill there
is discoverable to Claude Code *at runtime*, but it is invisible to the vault:
nothing in `obsidian/` said it existed, when to reach for it, or how it relates
to the hard rules. That contradicts ADR-0006 (the vault is the single source of
truth) and leaves the invocation decision to model judgement — exactly the kind
of thing this project pins down in writing. A performance request on a
scene-carrying project would otherwise get whatever fix order the agent invented
that day, when the skill exists precisely because the order matters (audit →
bot path → tiering → prewarm → visibility gate → budgets → fill).

**Decision.** A skill is only "installed" once it is registered:

1. The skill lives at `.claude/skills/<name>/`.
2. A vault note under `workflows/` documents what it does, its trigger
   conditions, and how it maps onto this project's primitives.
3. It is linked from [[README]]'s Map of Content and from the skills table in
   [[ai-agent-guide]].
4. If invocation should be non-optional, the routing rule goes into AGENTS.md's
   hard rules — the shim every agent reads first.
5. It is logged in [[changelog]].

For `optimize-3d-scene` this became **hard rule #11**: a performance / jank /
pre-ship request **and** a three.js or WebGL scene in the project → invoke the
skill and follow its order. The vault note [[optimize-3d-scene]] additionally
maps the skill's canonical patterns (which reference an external workspace) onto
what the starter already ships — the shared ticker (ADR-0009) for its one-rAF
rule, `isBot()` (ADR-0010) for its bot path, the Lenis store for scroll, the
in-view hooks for its render gate — so following the skill does not produce a
second copy of infrastructure that exists.

**Consequences.** Skill invocation becomes a documented rule rather than a guess,
and the routing survives model, tool and session changes because it lives in
AGENTS.md and the vault, not only in the skill's own `description`. The cost is
one extra note plus two index edits per skill — the same tax every component and
hook already pays. The starter still ships **no `three` dependency**
([[tech-stack]] unchanged); rule #11 is dormant until a project adds one. A
wrong vault path inside the skill (`obsidian/Meta/…`, plus an `open-questions.md`
this vault does not have) was corrected as part of registering it — registration
is also the moment a skill gets checked against reality.

---

## ADR-0015 — Strict three-tier design-token naming convention

- **Status:** Accepted
- **Date:** 2026-07-17

**Context.** ADR-0004 made tokens the styling currency but never said what a token
should be *called*. The starter shipped two tokens (`--background`,
`--foreground`) and no grammar, so every project built from it would invent its
own — defeating the point of a shared starter, since an agent moving between
projects could not predict a token name without reading `globals.css`. Reference
taken from [Mavik Labs — *Design Tokens in Tailwind v4*](https://www.maviklabs.com/blog/design-tokens-tailwind-v4-2026/)
(three tiers: primitive → semantic → component).

**Decision.** Adopt the three-tier model with an explicit grammar, documented in
[[design-system]] and codified as AGENTS.md hard rule #4:

| Tier | Grammar | Lives in |
|------|---------|----------|
| Primitive | `--raw-<category>-<name>[-<shade>]` | `:root` |
| Semantic | `--<role>[-<variant>][-<state>]` | `:root` |
| Component | `--<tw-namespace>-<component>[-<property>]` | `@theme inline` |

- Only Tier 1 holds literals; Tier 2 names purpose, never appearance; Tier 2 is
  the themeable layer (dark mode overrides there). No tier may be skipped.
- Every `@theme inline` entry is exactly `--<namespace>-<role>: var(--<role>)`.
  `inline` is load-bearing — it inlines the `var()` into each utility so Tier 2
  overrides cascade; binding a literal freezes the value and breaks theming.
- Tier 3 stays rare by design (ADR-0012 prefers a React component).

**Two deliberate deviations from the reference article**, both verified against
`tailwindcss` v4.3.3 by compiling a probe stylesheet:
1. The article names primitives `--color-blue-500`. We prefix them `--raw-*` and
   keep them out of `@theme` — under Tailwind v4 a `--color-*` entry *generates
   utilities*, so naming primitives that way would emit a `bg-blue-500` for every
   raw value and let markup bypass the semantic tier.
2. The article lists `--duration-fast` / `--duration-normal` next to `--ease-*`.
   **There is no `--duration-*` namespace in Tailwind v4** — the probe confirmed
   `duration-fast` compiles to nothing and the variable is not even emitted from
   `@theme inline`. Durations therefore stay Tier 2 only, consumed as
   `duration-[var(--duration-fast)]`. (`--ease-*` *is* a real namespace and is used.)

Retrofit is **minimal and unopinionated**: the existing background/foreground
tokens were restructured into the tiers, and the primitives/durations/`--ease-entrance`
/`--leading-display` they imply were added. **No brand palette was invented** —
the convention is the deliverable; projects add `--raw-color-brand-*` themselves.

**Consequences.** Token names are now predictable across every project from this
starter. This **amends ADR-0004**, which said only that new values go in
`globals.css` first — they must now also follow the tier grammar. `globals.css`
grew a documented tier structure but stays bounded (ADR-0012). Existing markup is
unaffected: `bg-background` / `text-foreground` still resolve, since the Tier 2
names and `@theme` bindings kept their public names.

---

## ADR-0014 — Narrow CSS-transition exception for trivial state changes

- **Status:** Accepted
- **Date:** 2026-07-17

**Context.** ADR-0002 banned CSS transitions outright to force every motion
through the spring layer. In practice the ban's cost lands hardest where its
benefit is lowest: a nav link fading its colour on hover had to become a client
component wrapping `<Hover>` with a spring config, to animate one property that
no user will ever interrupt or perceive as physical. The rule pushed teams toward
either boilerplate or quiet rule-breaking.

**Decision.** Keep hard rule #1 for all real motion; carve out one narrow,
condition-bound exception. CSS `transition-*` is allowed **only** for simple,
discrete state changes — `hover:` / `focus-visible:` / `active:` colour, opacity,
border-colour, underline, and small decorative nudges — subject to three
conditions, all required:

1. **Token-backed timing** — `duration-[var(--duration-fast)] ease-entrance`; raw
   ms/cubic-bezier values remain banned by hard rule #4.
2. **`transition-*` only** — `@keyframes` stay banned outright. Anything long
   enough to need keyframes is long enough to deserve a spring.
3. **Utilities only** — the transition lives in `className`, never in a CSS file
   (ADR-0012).

Everything scroll-driven, revealing, layout-affecting, staggered, orchestrated,
or interruptible remains spring-based; text remains [[text-engine]]. Anything
past the allowed list is `<Hover>`.

**Consequences.** A hover colour change no longer needs a client component — the
common case gets cheaper and the spring layer keeps the cases it is actually good
at. This **amends ADR-0002**, whose "CSS transitions are banned" is now "CSS
keyframes are banned; transitions are limited to the list above". The exception is
deliberately narrow and enumerated rather than a judgement call ("simple
animations") so it cannot erode into general CSS animation. `--raw-duration-*` /
`--duration-*` / `--ease-entrance` tokens exist to serve it (ADR-0015).
[[animation-system]], [[design-system]], and [[ai-agent-guide]] updated to match.

---

## ADR-0013 — `<Inview>` self-observe fix; spring components honour resize

- **Status:** Accepted
- **Date:** 2026-06-07

**Context.** `<Inview>` only animated when an external `trigger` ref was passed.
Without one it never revealed. Root cause: `useDynamicInView` returns its target
attachment as a **callback ref** (`setNode`) in the first tuple slot, but
`in-view.tsx` destructured it as `inViewRef` and wrote `inViewRef.current = node`
in the JSX `ref` callback — assigning `.current` to a function instead of calling
it. `setNode` never ran, the observed `node` stayed `null`, and with no `trigger`
the observer had nothing to watch (`trigger?.current ?? node` → `null`). With a
`trigger` it worked only because `trigger.current` bypassed the dead `node` path.
TypeScript flagged this at build time (`Property 'current' does not exist on type
'TargetRefCallback'`), so the build was already failing.

Separately, `<Inview>`, `<Spring>`, and `<Hover>` tracked `width`
(`useWindowWidth()`) as a `useMemo`/`useEffect` dependency to re-evaluate mobile
gating on resize, but never passed it to `isMobileDisabled()` — so the value was
genuinely unused (ESLint `react-hooks/exhaustive-deps` warning) **and** resize
re-evaluation silently did nothing; the check always read `window.innerWidth` at
call time.

**Decision.** This is the second authorized edit to the `#do-not-modify` engine
(after ADR-0009). Two corrections:
1. In `in-view.tsx`, call the callback ref — `setInViewNode(node)` — instead of
   assigning `.current`, so the component observes itself when no `trigger` is
   given.
2. Pass the React-tracked `width` into every `isMobileDisabled(value, width)`
   call across `in-view.tsx`, `spring.tsx`, and `hover.tsx`. This is the
   documented second parameter of `isMobileDisabled` and makes the `width`
   dependency meaningful, fixing resize re-evaluation and clearing the lint
   warnings.

**Consequences.** `<Inview>` now works standalone (the common case). `yarn build`
and `yarn lint` are both clean (0 errors, 0 warnings). The springs folder remains
`#do-not-modify` by default — these were explicitly signed-off bug fixes.

---

## ADR-0012 — Styling lives in utilities and components, not `globals.css`

- **Status:** Accepted
- **Date:** 2026-05-22

**Context.** ADR-0004 made design tokens the styling currency and ruled that
"new values must be added to `globals.css` first." Combined with the
design-system guidance to *"extract repeated multi-class patterns to
`@layer components`"*, the path of least resistance for any repeated visual
pattern became a named class in `globals.css`. On an animation-heavy,
multi-section marketing site that grows the file without bound — a single
global stylesheet accumulating hundreds of component-specific classes that are
never deleted when their component is. The fix is a placement rule, not a
file-splitting trick: splitting `globals.css` into many files only spreads the
same bloat.

**Decision.** Styling follows a strict placement order; `globals.css` stays
bounded by design.

- One-off styling → **Tailwind utilities** in `className`. Nothing enters CSS.
- A repeated pattern with markup/structure/props → a **React component**
  (`components/ui/`), *not* a CSS class. This is the default answer to "this
  looks repeated" — e.g. an eyebrow label with a `::before` dot is an
  `<Eyebrow>` component, not a `.label-eyebrow` class.
- A repeated pure-utility combo with no structure → a Tailwind v4 `@utility`.
- `@layer components` is reserved **strictly** for what utilities and
  components genuinely cannot express: pseudo-elements (`::before`/`::after`),
  third-party DOM overrides (`!important` on library markup), complex
  descendant/state selectors.
- `globals.css` only ever holds: `@import`, tokens (`:root` + `@theme`), base
  element resets (`@layer base`), and the narrow `@layer components`
  exceptions above. If it grows past that, something was misplaced.
- CSS Modules were considered and **rejected** — a second styling mechanism
  for the rare bespoke-CSS case is not worth the extra mental model when
  motion is spring-based (no keyframes — ADR-0002) and utilities + components
  cover everything else.

**Consequences.** `globals.css` stays a few-hundred-line file indefinitely.
"Repeated thing" pressure now pushes toward React components — which the
project wants anyway. This **amends ADR-0004**: design *tokens* still go in
`globals.css` first, but component-specific *classes* no longer do.
[[design-system]] and [[component-conventions]] updated to match.

---

## ADR-0011 — API layer: `app/api` route handlers, secrets server-side

- **Status:** Accepted
- **Date:** 2026-05-22

**Context.** The starter had no API layer. It needs a convention for reaching
external services that keeps secret keys off the client and gives endpoints a
consistent shape.

**Decision.** External calls go through Next.js Route Handlers —
`src/app/api/<resource>/route.ts`:
- **The handler owns the work** — business logic, multiple upstream calls,
  filtering, and reading secret env vars all live in `route.ts`. No mandatory
  passthrough service layer; extract shared code only when genuinely reused.
- Secrets are safe in handlers because `route.ts` is never bundled to the
  browser. Secret env vars are **unprefixed**; `NEXT_PUBLIC_` only for
  browser-safe values.
- Every endpoint: validates input with `zod`, returns the `{ data }` /
  `{ error }` envelope via the shared `handle()` wrapper (`src/lib/api/`), runs
  on the Node runtime (not Edge).
- `src/env.ts` validates env with zod — `publicEnv` vs `getServerEnv()`.
- Client Components fetch via `apiFetch` (`src/lib/api-client.ts`), same-origin
  only. Render-time data is read in Server Components.
- Added `zod`. The example endpoint is `app/api/contact/route.ts`.
- Codified as **AGENTS.md hard rule #9**.

**Consequences.** A clear, secret-safe API convention (full note:
[[api-architecture]]). Server Actions were considered for mutations but
deferred — for now everything goes through `app/api`. The choice can be
revisited if forms need progressive enhancement. First server dependency
(`zod`) and first server-only env var (`CONTACT_ENDPOINT`) now exist.

---

## ADR-0010 — SEO & performance hardening

- **Status:** Accepted
- **Date:** 2026-05-21

**Context.** A review found gaps that would hurt a production marketing site:
`metadataBase` defaulted to `null` (relative OG/canonical URLs never resolved to
absolute — broken social previews); `themeColor` sat on the deprecated metadata
field; there was no `robots.txt`, `sitemap.xml`, or structured data; the
`next.config.ts` was empty; `ScrollLayout` leaked a `requestAnimationFrame`
loop; the home view was a top-level `"use client"` (violating hard rule #6);
and the animation-heavy starter ignored `prefers-reduced-motion`.

**Decision.**
- **Site config.** `src/lib/site.ts` (`siteConfig`) is the single source of
  truth for SEO, fed by `NEXT_PUBLIC_SITE_URL` (fallback `http://localhost:3000`).
- **Metadata.** `metadataBase` is always set; `themeColor` moved to a
  `generateViewport()` / `viewport` export; dead `keywords` / `other` tags
  dropped; OG dimensions corrected to match the asset.
- **Crawlability.** Added `app/robots.ts`, `app/sitemap.ts`, and a JSON-LD
  `Organization`+`WebSite` helper rendered once in the root layout.
- **App Router files.** Added `loading.tsx` (enables streaming), `error.tsx`,
  `not-found.tsx`.
- **Rendering.** `HomeView` is a Server Component; client-only animation moved
  to the `HomeShowcase` leaf — models hard rule #6 instead of breaking it.
- **Reduced motion.** `<ReducedMotion>` calls react-spring's `useReducedMotion`,
  toggling the global `skipAnimation` — one app-root mount covers every spring
  and `spring-text-engine`. Chosen over per-component handling for its reach.
- **Build config.** `next.config.ts` now sets `removeConsole` (prod),
  AVIF/WebP, `next/image` breakpoints aligned to the adaptive-grid widths, and
  `poweredByHeader: false`. React Compiler is left as a documented opt-in (needs
  `babel-plugin-react-compiler`).
- Fixed the `ScrollLayout` Lenis rAF leak (cancel on unmount).

**Consequences.** Social/SEO metadata is correct in production once
`NEXT_PUBLIC_SITE_URL` is set. The first project env var now exists (see
[[environment-variables]]). `isBot()` stays available but is discouraged — it
opts routes out of static rendering; reduced-motion is the preferred lever (see
[[seo-metadata]]). React Compiler remains opt-in pending a dependency install.

---

## ADR-0009 — Shared animation ticker; authorized engine performance refactor

- **Status:** Accepted
- **Date:** 2026-05-21

**Context.** A performance review of the animation engine found load issues that
scale with the number of animated components on a page:
- `useLoop` started a **private `requestAnimationFrame` loop per hook instance** —
  N scroll-driven components meant N rAF loops, none of which ever stopped.
- `useWindowWidth` attached a **separate debounced `resize` listener per call** —
  one per spring component.
- `useDynamicInView` re-created its `IntersectionObserver` **on every render**
  (effect keyed on an unstable `options` object), and a dead `Proxy` branch
  created observers that were never disconnected.
- `useLoop`'s mount-only effect captured a **stale `onRender`**, so prop changes
  after mount were ignored.
All of this lives under `src/hooks/animation/` and `src/components/animation/springs/`
— `#do-not-modify` (ADR-0002).

**Decision.** With explicit user sign-off, apply a one-time performance refactor
to the protected engine, and introduce a shared, unprotected loop primitive:
- New `src/lib/animation/ticker.ts` — a single app-wide, reference-counted rAF
  loop (`subscribeToTicker`). It starts on the first subscriber, stops on the
  last, and throttles each subscriber independently. **Not** `#do-not-modify` —
  it is the supported extension point.
- `useLoop` now subscribes to the ticker and reads `onRender` / `framerate`
  through refs (fixes the stale-closure bug). Public signature unchanged.
- `useDynamicInView` rewritten without the `Proxy`: one observer, re-created only
  when the observed element or options actually change; exposes a callback ref.
- `use-window-size.ts` (not protected) now serves all three hooks from one
  debounced `resize` listener via `useSyncExternalStore`. The unused
  `debounceDelay` parameter was dropped.
- `mode="forward"` `scroll` listeners in `<Spring>` / `<Inview>` made `passive`.
- Hard rule #2 amended: the engine stays protected by default; changes require
  explicit sign-off.

**Consequences.** A page with N animated components now runs **one** rAF loop and
**one** resize listener instead of N of each, with no observer churn. Public
hook/component APIs are unchanged except `useWindowWidth`/`Height`/`Size`, which
no longer take a `debounceDelay` argument (no caller passed one). This **amends
ADR-0002's** do-not-modify scope.

A follow-up pass then cleared all 13 pre-existing ESLint problems in the engine
(also authorized): `isMobileDisabled` gained an optional `viewportWidth`
argument, missing `disableOnMobile` effect deps were added, a
`trigger.current`-in-cleanup hazard in `<Hover>` was fixed, `<Handle>`'s
transition effects were ref-stabilised, and `useProgressTrigger` now returns
`progress` as a `RefObject<number>` (no consumer affected).

---

## ADR-0008 — Adaptive scaling grid via root font-size

- **Status:** Accepted
- **Date:** 2026-05-21

**Context.** An adaptive scaling system was dropped into `src/components/common/`
to keep a rem-based design proportional across viewports. It shipped as a
`styled-components` implementation (`createGlobalStyle`, a `css` `media` helper,
`rm`/`em` helpers, plus `colors.ts` / `fonts.ts` / `utils.ts`). `styled-components`
is not a project dependency, and global CSS belongs in `globals.css` per ADR-0004.

**Decision.** Keep only the scaling behaviour; rebuild it to the project stack.
- **Scale down** (viewport ≤ largest breakpoint) — `vw`-based `html { font-size }`
  media queries in `globals.css`, inside `@layer base`.
- **Scale up** (viewport > largest breakpoint) — a `<AdaptiveGrid>` client
  component (`useAdaptiveGrid` hook) sets an inline `html` font-size at runtime,
  reusing the existing `useResizeLoop` render loop.
- Breakpoints live in `grid.config.ts` as typed config; the `globals.css` media
  queries mirror them and must be kept in sync (formula in both files).
- The dropped `styled-components` files were deleted, not committed.

**Consequences.** A rem-based layout now scales as one unit on every viewport.
`styled-components` stays out of the dependency tree. The breakpoint set is
duplicated across `grid.config.ts` and `globals.css` by design — the CSS-only
config rule (ADR-0004) forbids generating the media queries from JS.

---

## ADR-0007 — Automate the vault workflow with Claude Code hooks

- **Status:** Accepted
- **Date:** 2026-05-21

**Context.** The "read the vault first, follow the relevant guide, update the docs
after every change" workflow depended on the user reminding the agent each time.
Documentation drifts the moment it relies on memory.

**Decision.** Encode the workflow as Claude Code hooks in `.claude/settings.json`
(committed, team-wide):
- `SessionStart` — injects a pointer to read the vault first.
- `UserPromptSubmit` — on every request, reminds the agent to consult the relevant
  guide and to update docs for any change made.
- `Stop` — at the end of every turn, blocks **once** to confirm the vault was
  updated. A `${TMPDIR}` marker keyed by session id guarantees it blocks at most
  once per turn (no infinite loop).

**Consequences.** The documentation workflow is enforced without user prompting.
`.claude/settings.json` is now a tracked project file. Hooks are reviewable and
disableable via `/hooks`. New hooks take effect on the next session start (or after
opening `/hooks`). See [[ai-agent-guide]].

---

## ADR-0006 — The vault is the single source of truth

- **Status:** Accepted
- **Date:** 2026-05-21

**Context.** ADR-0001 left dense spec files (`project-specs.md`, `text-engine-docs.md`)
at the repo root alongside the vault, creating duplication — the same conventions
existed both as terse specs and as expanded vault notes, which would drift.

**Decision.** The vault is the **only** documentation source.
- `project-specs.md` — deleted; its content was already decomposed into the
  `architecture/` and `frontend/` notes (and `environment-variables.md`).
- `text-engine-docs.md` — moved into the vault as [[text-engine-reference]].
- `generic-layout-prompt.md` — moved into the vault (see ADR via [[changelog]]).
- Root keeps only thin shims: `AGENTS.md` carries the breaking-change warning and
  hard rules and points into the vault; `CLAUDE.md` and `.cursorrules` both
  `@`-import `AGENTS.md`.

**Consequences.** No documentation duplication. Agents bootstrap from `AGENTS.md`
and read vault notes on demand. This **amends ADR-0001** — root files no longer
hold canonical spec content.

---

## ADR-0005 — Use standard `next/link` for navigation

- **Status:** Accepted
- **Date:** 2026-05-21

**Context.** Two conflicting conventions existed: `project-specs.md` specified
standard `next/link` / `useRouter`, while `generic-layout-prompt.md` specified
custom `<AnimLink>` / `useAnimRouter()` wrappers. The custom wrappers were never
built.

**Decision.** Use standard Next.js navigation — `<Link>` from `next/link` and
`useRouter` from `next/navigation`. The `AnimLink` / `useAnimRouter` convention is
dropped. See [[routing]].

**Consequences.** `generic-layout-prompt.md` §5 updated to match. No animated-route-
transition layer exists; if one is needed later, revisit with a new ADR.

---

## ADR-0001 — Adopt an Obsidian vault as the project brain

- **Status:** Accepted — amended by ADR-0006
- **Date:** 2026-05-21

**Context.** Project knowledge was scattered across root markdown files
(`project-specs.md`, `text-engine-docs.md`, `AGENTS.md`). New contributors and AI
agents had no structured map of the system.

**Decision.** Introduce `obsidian/` as an Obsidian vault — a linked, navigable
second brain. Root spec files remain as machine-read sources; the vault expands on
them. See [[ai-agent-guide]].

**Consequences.** Docs must now be maintained alongside code. The vault is the
canonical place to *understand* the project; root files stay canonical for *tooling*.

---

## ADR-0002 — All motion is spring-based (`@react-spring/web`)

- **Status:** Accepted (inherited from starter) — amended by ADR-0014
- **Date:** Project baseline

**Context.** Marketing sites need rich, interruptible, physically natural motion.
CSS transitions and keyframes are rigid; competing libraries add weight.

**Decision.** Use `@react-spring/web` for every animation. A custom component layer
(`src/components/animation/springs/`) wraps it. CSS keyframes and `framer-motion`
are **banned**. CSS transitions were banned outright here; **ADR-0014 narrows that
to allow `transition-*` for trivial hover/focus state changes only.**

**Consequences.** All animation goes through the [[animation-system]]. The springs
folder is `#do-not-modify`. Text animation is delegated to [[text-engine]].

---

## ADR-0003 — Routes delegate to Views

- **Status:** Accepted (inherited from starter)
- **Date:** Project baseline

**Context.** Mixing routing concerns with page UI makes `app/` files heavy and hard
to test.

**Decision.** `app/**/page.tsx` files only import and render a component from
`src/views/`. All layout/UI logic lives in the view. See [[routing]].

**Consequences.** Every route is a 3-line file. Views are the real page components.

---

## ADR-0004 — Tailwind v4 with CSS-based config

- **Status:** Accepted (inherited from starter) — amended by ADR-0012 and ADR-0015
- **Date:** Project baseline

**Context.** Tailwind v4 removes `tailwind.config.js` in favour of CSS-native config.

**Decision.** All theme tokens live in `globals.css` under `:root` and `@theme inline`.
No JS config file. Raw values in class names are banned. See [[design-system]].

**Consequences.** Design tokens are the only styling currency. New values must be
added to `globals.css` first — and, per ADR-0015, must follow the three-tier
naming convention.
