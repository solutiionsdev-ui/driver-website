---
tags: [meta, changelog]
updated: 2026-09-23
---

# Changelog

## 2026-09-23

- **Menu links no longer 404.** Driver / view profile, Season and Next race
  scroll to `#career`, `#season` and `#paddock` on the home page through the
  new `<AnchorScroll/>` (stack-aware, Lenis-driven, pre-empts `next/link`).
  Journal, the Hungarian GP story, Store, Garage, Watch trailer and Legal open
  new `noindex` coming-soon pages (`ComingSoonView`, copy in
  `data/mocks/coming-soon.ts`). `StackLayer` and `Paddock` take an `id`.
  Verified in headless Chrome: desktop nav, footer from page bottom, phone menu
  sheet, and arriving on `/#paddock` from another route. ADR-0031.

## 2026-09-08

- **The liquid reveal is off on phones — the entrance burn stays.**
  `SceneTier.reveal`, false on the mobile tier. On touch there is no cursor,
  so the reveal was driven by the idle sweep: a synthetic stroke every five
  seconds, warped by two noise fetches and evaluated as up to 18 capsule
  distances per fragment of the helmet, every frame, forever — the one thing
  in the frame that never rested, for a gesture the owner judged the phone
  does not need. `applyFit` now zeroes `autoSweepAmount` on such a tier (last
  in the spread, so it overrides the `(hover: none)` and `max-width: 639px`
  overrides that used to switch the sweep *on* there), and the parked-cursor
  fallback in `update()` — which forced the pace gate open when no sweep was
  running so the helmet would not vanish — is gated on the same flag, because
  on this tier vanishing is the point: the helmet arrives whole, burns away
  on the loader's cue, and the portrait stands on its own. Both trail loops
  now exit on their gate before touching a sample. Follows a tier change like
  everything else the tier decides. ADR-0030, point 5.

- **The hero scene simplified on phones, and it follows a tier change.**
  Reported as "lagging on mobile, even in the Chrome device preview" — and the
  second half of that is the tell. The mobile tier was already at DPR 1
  (390×844 = 329k fragments, a ninth of a desktop's), so on a desktop GPU
  under emulation fill could not have been the cost. What was: a **26fps
  cap** on a scene whose every motion is fast (a 0.45s sweep stroke, a burn,
  a helmet that tilts with the pointer), which steps visibly however cheap the
  frame. See [[decisions-log]] ADR-0030 for the trade-offs; the changes, with
  what each one is worth:

  | change | before | after |
  |---|---|---|
  | frame cap, touch tiers (`frameInterval`) | 1000/30 phone, 1000/45 tablet (26 / 40 measured) | `1000/60 − 2` — 60 on a 60Hz screen, every second tick at 120 |
  | backdrop reveal loop where `bgRevealOpacity` is 0 (every touch width) | ran over every fragment, multiplied by zero — ~6M segment distances per frame on a phone | skipped by a uniform branch |
  | scanning wireframe on the mobile tier | 113k line segments per frame, mostly sub-pixel over a ~300px helmet | not drawn (`SceneTier.outline`) — 4 → **3 draws per frame** |
  | portrait maps (2048² diffuse and alpha) | `LinearFilter`, no mip chain — 7× minified on a phone, every fetch a cache miss | mipmapped (trilinear) |
  | DPR caps | 1 / 1.25 / 1.5 | unchanged — already what was asked for |

  **A tier change mid-session is followed now.** The resize observer used to
  be switched off entirely on touch-class devices, to keep the iOS URL bar
  from rebuilding the framebuffer mid-scroll — which also meant a page opened
  under a device emulator and returned to a desktop viewport kept a phone's
  canvas size, budget, parked pointer and hidden wireframe for the rest of the
  session. The observer now runs on every tier and ignores only **height-only**
  changes on a coarse pointer (that is what the URL bar is); a width change or
  a flip of the `(hover: none) and (pointer: coarse)` query re-reads the tier
  and `HeroScene.retune()` applies everything that is not baked: DPR, budget,
  the wireframe, the pointer (parked or listened to — the listener is bound
  and unbound to follow), and a frozen scene resumes. `trailSamples` and
  `antialias` stay as built.

  Verified over CDP on the dev server, counted quantities only (SwiftShader
  fps is meaningless): emulated phone → buffer **390×844**, **3** draws per
  frame, 6 programs; emulation off → buffer **2160×1350** (1440 × the 1.5 cap),
  **4** draws (the wireframe is back), still 6 programs — so the tier switch
  compiles nothing mid-session; back to phone → 390×844, 3 draws. **Not
  measured: a real phone.** The fill and frame-rate arguments above are
  arithmetic, not a profile; the next pass should put it in a hand.

- **The helmet's cursor turn retuned on the new degree sliders, and the panel
  hidden.** The owner's pass over the four new params: `helmetAmpX` **−8.6 →
  2.5**, `helmetCurveX` **6.67 → 0**, `helmetAmpY` **0.86 → 2.1** (`helmetCurveY`
  stays 0). The other 59 values in the supplied config match the shipped
  defaults exactly. So: a small, linear turn on both axes, and the pitch now
  goes *with* the cursor rather than against it — about 6px of crown travel
  across a full sweep, under the whole composition's `subjectParallax`. Once
  the angle was a number on a slider the tuned answer was a fraction of what
  the gain-and-cap pair had been shipping, which is roughly the case for the
  degree sliders in one line.

  The tuning panel is now behind `SHOW_CONTROLS` in `hero-scene/index.tsx`,
  **off**. It is still development-only underneath; this is the switch for
  hiding it in development once a pass is done and the rig is in the way of
  looking at the result. Flip to `true` to tune again.

- **The footer's second helmet is gone.** The suit plate (`body.webp`) is a
  full portrait — the driver's head, his hair, and his own helmet held beside
  it — that was always meant to sit behind the helmet plate. But the two
  plates are not to one scale: the design sizes the suit at 0.75 frame px per
  image px and the helmet at 0.65, so the portrait's head was drawn a seventh
  larger than the helmet hiding it, and its right cheek, the visor tab and a
  curl of hair showed past the front helmet's edge as a second helmet behind
  the first.

  Fixed with a **mask on the suit plate, not a rescale** — `FIGURE.body.suitFrom`
  / `suitTo`, a `mask-image` fade from 0.69 to 0.72 of the plate's height. The
  suit's size and place are the design's and stay; only what the plate is
  allowed to show changes. The fade sits under the helmet's chin (which covers
  the collar down to 0.72 of the plate at its narrowest), so the join is never
  visible. Measured against the helmet's alpha with a compositing script, then
  verified on the running page at 1440×900.

- **The hero's cursor rotation is set in degrees now, per axis.**
  `helmetRotX` + `tiltLimit` + `helmetRotY` are replaced by four params:
  `helmetAmpX` / `helmetAmpY` — the **angle in degrees** the helmet reaches
  with the cursor at the edge of the window, one per axis, signed — and
  `helmetCurveX` / `helmetCurveY`, the shape on the way there (0 linear,
  higher saturates earlier). On the panel as Helmet > rot x amp °, rot x
  curve, rot y amp °, rot y curve.

  Why: the owner asked for a control over the amplitude of each axis, and
  there was none. The pitch's amplitude was the *product* of a gain and an
  input cap in radians, so no slider read as "how far it turns", and with the
  gain already at its slider's floor there was no way to ask for more. The yaw
  was a bare gain with no ceiling at all. Now one slider per axis *is* the
  angle, and the curve is normalised (`tanh(c·v)/tanh(c)`) so it never changes
  the amplitude — the two knobs are independent, which the old pair was not.
  See [[decisions-log]] ADR-0029.

  The shipped look is unchanged to four decimals: `−1 × 0.15 rad` restates as
  **−8.6° at curve 6.67**, and the yaw's `0.015 rad` as **0.86° at curve 0**.
  The yaw also gets the tilt's second filter now — it went without while it was
  under a degree, but an amplitude on a slider can be raised to match the
  pitch, and then it needs the same weight. The stored dev-panel blob
  self-invalidated through ADR-0028's fingerprint, since the key set changed.

- **The hero's cursor tilt is back on, at the owner's tuned pair.**
  `helmetRotX` **0 → −1** with `tiltLimit` **0.25 → 0.15** — the only two of 63
  values in the supplied config that differed from the shipped defaults.

  The gain reads as extreme and is not: what a reader sees is set by the pair,
  and the cap holds it to **8.6°** at the screen edges and **20.9 px** of
  visible crown travel across a full cursor sweep (against 8.8 px for the whole
  composition's own `subjectParallax`). On the measured grid in `TILT_LIMIT`
  that lands between `−0.22` and `−0.50` at the looser cap. The pairing is not
  the same as a mild gain even though it measures like one at the ends: the cap
  holds the *edges* of the sweep while the gain keeps the response steep
  through the middle of the frame, where a reader's pointer actually is.

  It reached the browser without a manual step — the defaults fingerprint from
  [[decisions-log]] ADR-0028 dropped the stale stored blob on the next load,
  which is the first time that mechanism has been exercised by a real retune.

- **The paddock portrait and the footer figure drift too.** Same primitive as
  the timeline rows (`<SpringTrigger mode="scrub">`, `top` in `cqw` against a
  `relative` inner), but **each of the three blocks needed a different scheme**,
  and the reason in every case was measured headroom rather than taste:

  | | window | travel | why |
  |---|---|---|---|
  | timeline rows | crossing | centred, ±20/60/110 | room either side |
  | paddock portrait (`PARALLAX_PORTRAIT`) | crossing | **up only**, 48 | 14px above the crown, 0 below the foot |
  | footer figure (`PARALLAX_FIGURE`) | **ends at `bottom bottom`** | 60, into place | the block never finishes a crossing |

  - **The paddock portrait only goes up.** It is sized to fill the block: foot
    on the bottom edge exactly, crown clearing the top by ~14 real pixels.
    Drifting down spends that 14 and then opens bare backdrop above the head.
    Up only lifts the foot deeper into the dark band, which is solid black and
    where the figure fades out anyway.
  - **The footer figure rides *back into* place.** It is the last block, so its
    bottom can never leave the top of the viewport and a normal crossing window
    would stop part-way — leaving the figure displaced in the state every
    reader ends the page on. The window closes at `bottom bottom` and `to` is
    the design position, so the resting frame is exact. Verified: at the page
    bottom the layer reads `0cqw` and the suit still hangs 8px past the foot,
    covering the accent edge it is there to cover.
  - **The helmet and the suit move as one group.** They are a single figure on
    its own collar; two layers at different rates takes the head off the
    shoulders — the failure `FIGURE` already records for scaling them apart.
    The differential in that block is the figure against the panel behind it.

  Both blocks are Server Components; `SpringTrigger` is a client boundary and
  takes only serializable props, so no `"use client"` was added to either.

- **The timeline rows float.** The first pass at the row parallax was too
  timid to read as depth — 28 / 56 / 72 design px of upward drift is a spread
  of 1 : 2 : 2.6, and against a 462-tall row that is a nudge. Retuned, and the
  scheme changed with it:

  | | before | now |
  |---|---|---|
  | centre plate | 28 px | **40 px** |
  | side plate | 56 px | **120 px** |
  | copy | 72 px | **220 px** |
  | spread | 1 : 2 : 2.6 | **1 : 3 : 5.5** |
  | copy against its photograph | 44 px | **180 px** |

  (Figures are full travel across a crossing; `PARALLAX` stores half-ranges.)

  **The travel is now centred on the design position rather than hung off it**
  — each layer runs `+value` to `-value` instead of `0` to `-value`. Two
  reasons, and the first is the better one: the layer is exactly where the
  1440 frame puts it as the row passes the middle of the screen, which is
  where a reader actually judges the composition, where the old scheme was
  only ever frame-true on the way in. And it buys twice the differential per
  pixel of excursion, which is what the ask needed.

  It costs the property the old scheme was chosen for: `useSpring` initialises
  on `from`, so a row already on screen at first paint is half a travel out of
  place for the one frame it takes the ticker to read the scroll. Every row
  but the first is below the fold and the block is the page's third, so the
  correction lands long before the row arrives.

  Headroom re-measured against the gapless stack rather than assumed — a
  centre plate reaches the side row's year at ~109, a side plate the centre
  row's copy at ~181, and the copy stays inside its own 462-tall row (231
  either way). Every figure sits inside half its own limit. No separate mobile
  cap: the travel is in `cqw` off the block's width, so the copy's 110 is 110
  real pixels at 1440 and 30 on a 390-wide phone.

- **The timeline rows have depth.** *(First pass. The figures and the scheme
  below were both superseded later the same day — see "The timeline rows
  float" above; what survives is the layering, the year following its plate,
  and the `top`-in-`cqw` route.)* Each row's three elements drift at different
  rates as the row crosses the viewport, instead of moving as one flat card:
  the **copy** furthest (72 design px — it is the layer nearest the reader,
  over the photograph on `z-20`), the **side plate** next (56), the **centre
  plate** least (28, the ground the row is built on). The **year**
  takes its plate's figure rather than a fourth of its own — it is that
  photograph's marker, and its own layer would slide it off the picture.
  `<SpringTrigger mode="scrub">` throughout, the project's sanctioned primitive
  for this ([[animation-system]]); figures in `PARALLAX` in
  `timeline/geometry.ts`, the wrapper is `ParallaxLayer` in `timeline-row.tsx`.

  This is *of* the frames — the existing parallax inside them, the photograph
  riding its own slot, is untouched and composes with it. The second is what
  keeps the first from reading as a sticker being slid around.

  Three things the implementation is pinned to, none of them taste:

  - **Layers rest at 0 and only drift up.** *(Superseded — the travel is
    centred on the design position now.)* A layer that never goes below its
    layout box cannot collide with the row beneath it, and `useSpringTrigger`
    parks a disabled trigger on `from` — so a viewport that never runs the
    scrub still lays the block out exactly as the 1440 frame has it.
  - **Travel is small because the rows butt with no gap.** It is the one figure
    in the block that can put two rows on top of each other. Centre and side
    plates never overlap horizontally (32 + 333 = (1440 − 710)/2) and two
    centre rows are a 217-tall side row apart; these figures stay well inside
    that.
  - **It animates `top` in `cqw`, not a transform.** Both obvious routes fail
    silently — see the new warnings in [[components/animation-springs]] — and
    `cqw` because the whole block is measured off its own width, so a parallax
    in fixed pixels would be the one thing in it that did not scale.

  Also caught in review: `SpringTrigger` emits `div` inside `div` by default,
  which is invalid inside the copy's `<p>` and the year's `<span>` and logged
  a hydration error. `ParallaxLayer` takes an `inline` prop that switches both
  tags to spans. Verified on a fresh tab: no console errors, and the three
  layers scrub to 1.9444 / 3.8889 / 5cqw with the years matched to their
  plates.

## 2026-09-07

- **The hero wears the right helmet.** `helmet.glb` — the yellow McLaren /
  Monster livery [[decisions-log]] ADR-0022 flagged as "plainly wrong for a
  Kimi Antonelli frame" — is replaced by a supplied Mercedes-AMG Petronas model
  that ships its own baked PBR set (base colour, normal, metallic-roughness in
  its own UVs, embedded as WebP). It arrived twice on the same day: `helmet2.glb`
  first, then `helmet3.glb`, which is **what ships** — same shape of export, a
  crisper atlas, and a third of the geometry. The shell now keeps the material
  `GLTFLoader` builds from the glTF, so the whole external livery atlas is gone
  from the load: **six texture requests dropped** (~478 KB) against a GLB that
  grew 139 KB → 782 KB, i.e. ~160 KB more in one request instead of seven.
  `noise.webp` still loads — it is the shared reveal/burn noise, not a helmet
  map. `scripts/recolor-helmet.mjs` and its de-branded atlases are now dead:
  there is no branding left to suppress. Nothing in `buildHelmet` names the
  model or its meshes, so swapping export revisions is a one-line path change.

- **The separate visor is gone with it.** The old model split into
  `helmet` / `glass` / `plastic` nodes matched by name; the new one is a single
  mesh under a single material, so the name matching, the `MeshPhysicalMaterial`
  visor and the `glassOpacity` scene control are removed. The visor is opaque
  baked texture now, so the reveal covers the eyes over it rather than showing
  them through tinted glass — a property of the supplied model. `FrontSide` is
  forced over the export's `doubleSided: true`, or the transparent
  depth-write-off shell shows its own back faces.

- **The helmet stopped snapping to the cursor.** Two separate lurches, both
  reported as "it turns up sharply when I move the mouse", neither of them
  about amplitude:

  1. **The first pointer event was treated as a movement.** There is no API
     that says where the cursor already is, so `pointer` / `smoothed` /
     `lastSmoothed` all started at (0, 0) — dead centre, where the cursor
     almost never is. The first `pointermove` then eased the scene from that
     assumption to the truth, animating a journey that never happened: from a
     pointer resting high in the window the helmet swung **up out of level in
     ~270 ms** the instant the mouse twitched. It also fed the pace term a
     step the size of half the screen, which read as enormous velocity and
     bloomed the reveal, and left the trail a stroke across the middle of the
     frame. `setPointer` now **seeds** the whole chain from the first position
     it is given, so the first frame after discovery is simply correct.

  2. **A single lerp is fastest at t=0.** `smoothed` follows the cursor at
     `pointerLerp` 0.17, and a first-order filter's step response leaves at
     full speed and decays — the helmet left every gesture at 17% of the gap
     per frame and coasted in. That is a lurch regardless of how far it
     travels, which is why damping the amplitude twice never fixed it. The
     tilt now runs through a **second** filter, so its velocity starts at zero
     and ramps:

     | | one lerp | two cascaded |
     |---|---|---|
     | velocity, frame 1 | **17.0%** | **2.9%** |
     | peak velocity | 17.0% (frame 1) | 6.9% (frame 5) |
     | 90% settled | ~230 ms | ~430 ms |

     The second filter is on the tilt alone, not on `pointerLerp`, which every
     other reader of the cursor shares — the reveal brush is *meant* to leave
     instantly, that snap is the effect, and slowing the shared value would
     take the trail down with it.

  Frozen tiers (reduced motion, energy-saver phones) seed their tilt from
  `STATIC_POSE` at construction for the same reason: nothing should ease in
  from a pose that was never true.

- **Retuned defaults now actually reach the browser.** The dev panel persists
  its params to `localStorage`, and **a stored value always wins over
  `DEFAULT_PARAMS`** — so once a machine has touched any slider, every later
  change to a shipped default is silently shadowed there. Confirmed live: while
  the tilt was being retuned, the source said `helmetRotX: −0.22` /
  `tiltLimit: 0.25` and the running page was on **−0.01 / 0.15** out of storage.

  This is the second time the same trap has bitten — the key was already at
  `:v2` for it — and this time it cost most of a session: four rounds of
  retuning `helmetRotX` and `tiltLimit` landed in the source and none of it
  reached the screen. The symptom is "nothing changed", which is
  indistinguishable from a broken edit, so the search goes to the maths rather
  than to the storage.

  Two fixes, because bumping the key only helps the person who already
  suspects:

  1. `PARAMS_STORAGE_KEY` bumped **`:v2` → `:v3`**, which drops every existing
     blob.
  2. The blob now carries a **fingerprint of the defaults it was written
     against** (`__defaults`, a reserved key `readStoredParams` ignores when
     merging). On read, a mismatch drops the blob instead of letting it shadow
     the new look. Retuning any default therefore self-invalidates stale
     storage, and the key should not need bumping by hand again. Verified by
     corrupting the stamp: the blob is removed on the next load and the
     sliders come back to the shipped values.

  Every stored value is one a slider wrote, so nothing discarded here is worth
  shadowing a deliberate change to the shipped look. Production is unaffected —
  persistence is `NODE_ENV === "development"` only and folds away in a build.
  See [[decisions-log]] ADR-0028.

- **The helmet's cursor tilt was built, tuned, and rolled back off.**
  `helmetRotX` stays at **0**, as it shipped before today — the owner turned it
  on at −0.22, it was retuned across most of a session, and the decision was to
  return the config to where it started. Only the *values* went back: the
  machinery is still there and still reachable from the panel, exactly as
  `autoSweepAmount` keeps its four sliders at 0. Nothing about the shipped look
  changed from the pre-session state.

  What the session established, if the tilt is ever wanted again:

  - **The amplitude knob is `tiltLimit` (Helmet > tilt cap), not the gain.**
    The tilt input runs through `saturate(y, tiltLimit)` —
    `limit * tanh(y / limit)`, linear through zero, easing onto the limit — so
    the helmet answers the cursor as tuned around the middle of the frame,
    where a reader's pointer lives, and stops running away toward the edges.
    `tanh` and not a clamp: a clamp leaves a corner where the tilt stops dead,
    and that corner sits where a cursor crossing the frame is moving fastest.
  - Visible crown travel across a full cursor sweep, 1440x900:

    | | `rot x` −0.10 | −0.22 | −0.50 | −1.00 |
    |---|---|---|---|---|
    | cap 0.15 | 2.1 px | 4.6 px | 10.5 px | 20.9 px |
    | cap 0.25 | 3.5 px | 7.7 px | 17.5 px | 34.1 px |
    | cap 0.35 | 4.9 px | 10.7 px | 24.1 px | 46.0 px |

    Uncapped at −0.22 it is **30 px**, which read as far too much. For scale,
    `subjectParallax` moves the whole composition 8.8 px over that sweep.

  > [!warning] The obvious formula for "how far does the crown move" is wrong
  > Tilting about a horizontal axis moves the crown almost entirely in **z**:
  > `y' = h·cos(θ)` changes only in θ², while `z' = h·sin(θ)` is first-order.
  > `h·sin(θ)` is therefore the crown's **depth** swing, not its on-screen
  > travel — what a reader sees is the much smaller second-order drop plus
  > what perspective makes of the depth. **At these angles that is a factor of
  > about four**, and three rounds of tuning were done against the wrong
  > figure. Size this by projecting the crown through the real camera.

  `rot x` was also widened **−0.4…0.4 → −1…1**, and kept symmetric although
  only the negative end was asked for: the sign is a direction, and an
  off-centre zero is a worse instrument than a wide one. The tilt is pitch
  only — the yaw's gain is a fifteenth of it, so capping or damping the yaw
  too would only make the helmet answer one axis and not the other.

- **The helmet turns about its own centre now, not about a point 0.66 units
  away from it.** Reported as "at negative `rot x` the helmet moves strangely,
  it turns far too much". It was not turning too much — it was *orbiting*. The
  mesh sat `HELMET_WORN_OFFSET` (0, −0.56, 0.35) inside `helmetGroup`, and the
  tilt was applied to that group, so every degree of `rot x` swung the helmet
  through an arc of radius ~0.66 and dragged it along **z** as well as **y**.
  Under a perspective camera a z-swing is an apparent size change, so the
  helmet lunged toward the viewer and grew on one side of centre and receded on
  the other — which is why the same magnitude read far stronger negative than
  positive. Measured at `rot x` −0.25 over a full cursor sweep: **0.120 world
  units of parasitic vertical travel and 0.191 of z**, a 3.1% swing in apparent
  size, against the 0.016 of vertical travel `follow` asks for at its default —
  **7.5× more unintended motion than intended**. Fixed by carrying the worn
  offset on a new `helmetPivot` node and turning *that*, so the offset is no
  longer inside the rotation; the outline wireframe moves onto the same node or
  it stays put while the shell tilts. Placement, scale and the shipped look are
  unchanged — at `rot x` 0 the two transforms are algebraically identical, and
  the default `rot y` of 0.015 differs by ~0.5 px. The bug was always there;
  the negative range added below simply made it visible.

- **The pointer-response sliders open up below zero.** Five controls in
  SCENE CONTROLS were floored at 0 — Helmet `follow` / `rot x` / `rot y`, Head
  `depth`, Scene `parallax` — and every one is a plain multiplier on the
  smoothed pointer offset, so the sign is a *direction*, not a magnitude. The
  floor was hiding half of each range: negative makes the helmet lean and drift
  against the cursor instead of with it, pushes the portrait's UVs the other way
  against its depth map, and slides the whole composition counter to the
  pointer. Each became symmetric about zero — `rot x` −0.4…0.4 at this point,
  widened again to −1…1 later the same day (see above). Helmet
  `scale` and `brightness` deliberately stay positive: a negative scale mirrors
  the mesh and flips its winding against the `FrontSide` shell, and a negative
  colour multiplier only clamps to black. Defaults are untouched, so nothing
  about the shipped look changes — it is reachable tuning range, in a dev-only
  rig (`hero-scene/controls.tsx`). It paid for itself immediately: the first
  negative `rot x` exposed the orbiting-helmet bug fixed above.

- **Geometry came out lighter than the helmet it replaced, and frame rate never
  moved.** 45,501 → 37,783 triangles, paid twice (shell + the outline wave's
  merged wireframe), so the saving counts double. The intermediate `helmet2.glb`
  went the other way at 98,706 and cost nothing measurable either — the scene is
  fill-bound on the full-screen mask (ADR-0023), not vertex-bound. Measured on
  `yarn build && yarn start`, desktop, hero on screen: median frame **16.7 ms**,
  p95 17.1 ms, max 17.9 ms — a held 60 fps (helmet2: 16.7 / 17.5 / 18.0, the
  same). Not re-measured on the mobile tier. See ADR-0027.

## 2026-08-26

- **The hero's scene stopped drawing three screens down.** It is the first
  layer of the sticky stack, so it pins at `top: 0` and the blocks after it
  scroll *over* it — its rect never leaves the viewport and the
  `IntersectionObserver` that gates the render loop reported it visible for the
  whole page. Measured on a production build at 390x844 with an iPhone UA: the
  scene ran at **22.7 fps with the hero three viewports above the fold**; it is
  now **0 fps** there. The loop also skips on `document.hidden`. The test is the
  scroll position rather than the element's geometry, because the pin is exactly
  what makes the geometry useless (`hero-scene/index.tsx`, `COVERED_AFTER`).
  Frame rate while the hero is on screen is unchanged at ~22 fps (the tier's
  30 fps budget, which errs cheap by design), and draw calls stay at 5.0/frame.

- **The season map's two canvases stop rendering at 2x on phones.** Both are
  sized to the frame's own 1440x800 stage rather than to the screen, so a phone
  was allocating **2876x1618 and 2880x1600 — 9.25 megapixels** of decorative dot
  field and trace behind a 390-wide viewport. Capped at 1x on coarse-pointer
  devices they are **1438x809 and 1440x800, 2.31 MP: a 75% cut** in backing
  store and in the fill of every repaint, with no visible difference (the stage
  is scaled down by transform at that width anyway). Desktop keeps 2x —
  verified unchanged at 1440 (`season-dots.tsx`, `season-circuit.tsx`).

- Not measured: absolute frame rate on real hardware. Headless Chrome runs
  SwiftShader, so only counted quantities (draw calls, buffer pixels, program
  links, loop ticks) transfer from these numbers.

## 2026-08-22

- **The halftone ships with no ambient light, and the lap loads clean.** The
  block used to draw its trace through a travelling cluster of glyphs: the
  lap's head was the halftone's default light source (`edge`), so the field lit
  up around the trace as it drew, and the trace carried its own ASCII head on
  top of that — a low-res luminance buffer that ate the line into glyphs behind
  the tip. Both are gone. `HalftoneSource` gains `none`, which is now the
  shipped setting, and `edge`/`wave` stay in the tuning panel; the lap keeps its
  glow and its tip spark and nothing else. `ascii.ts` had no readers left and
  is deleted, along with the offscreen buffer in `season-circuit` and the
  `glyph` param in the store.

- **The lit dot is a chequer, not an ASCII glyph.** The ramp's bright end is
  `+ * #`, so the cursor dragged a cluster of crosses over the map — and a
  cross is the one mark this block cannot spend, with grid axes, a hub, corner
  ticks and the reticle's own arms all already crosses. A dot the light reaches
  now squares up instead: the square grows with the light and the lattice's own
  parity decides whether it fills or clears, so at full strength the squares
  meet edge to edge and the patch is a **chequered flag** — the thing a race
  actually ends on, and the same mark the block already draws at the finish.
  The seed size is 0.7 of the lattice pitch rather than the dot's own 0.45:
  tied to the dot, the far half of each reticle arm drew squares barely bigger
  than what they replaced and read as a faint dotted line. The square arrives
  as a square; the light level rides in its colour.

- **The timeline's year dims only where it lands on a plate.** First pass put
  every year at 0.4, off a misread of the reference — the element measured was
  not the one on screen. The reference's rule is positional: over its black
  ground the year is white and solid, and only the one lying on a photograph
  drops back. The timeline already has that split for free — a side row puts
  its plate out at a gutter and the year sits over bare ground, a centre row
  puts the plate under it — so it is `side ? "" : "opacity-40"` and nothing
  more. Verified across all ten rows: five at 1, five at 0.4, alternating.

- **One base for every block, and the season block joins it.** Four of the six
  blocks measure themselves in `cqw` off their own container, so a design pixel
  stays a design pixel at any width; the hero and the season block are written
  in rem, and between 1441 and 1920 the root is based on 1920, which renders
  them at 1440/1920 of the size they are drawn at. Side by side that is
  visible: at 1512 the season block's intro set 14.2 against the timeline's
  18.9 directly under it. `[data-season]` now takes the same 1920/1440 the
  hero does. The arithmetic is worth keeping — in that band a rem is
  `width/1920`, so `rem * 1920/1440 == width/1440`, which is exactly one `cqw`
  design pixel. The two schemes are **pixel-identical across the whole band**,
  and that is why this is a fix rather than a tuning. Verified: at 1512 the
  season's intro and the timeline's copy both set 18.9, their gutters both land
  at 33.6, and at 1440 and 1280 nothing moves at all.

  The block's boxes travel with it through `px()` in its own `geometry.ts` —
  `calc(Nrem * var(--season-base, 1))`, the rem twin of the `cqw` blocks'
  `px()`. Type alone would have overflowed the standings plate.

- **The hero's profile button is measured in em, off its own label.** Every
  number is the design's over the 20 it sets the label at: 220 wide is 11em, 50
  tall 2.5em, the 32 between label and arrow 1.6em, the 13x10 arrow 0.65 x
  0.5em. Figma (`943:92` inside `943:106`) puts the label 24 from the left and
  the arrow 24 from the right, which is what centring 172 of content in 220
  gives you — so the frame reproduces the design's padding and keeps
  reproducing it at any scale. In rem it could not: the label grows on the
  hero's base while a rem box shrinks on the band's, and at 1512 those two 24s
  had been squeezed to **2.3**. The footer's button never had the problem — it
  is `cqw` throughout, which is why it was the one that looked right.

- **The timeline's year sits at 0.4, which is what the reference does.** Read
  off eladiodieste.com directly: its year is a flat `opacity-40` that never
  brightens, hover or not. Ours was full-strength accent sitting right on top
  of the plate, so it read as the loudest thing in the row instead of as the
  plate's marker. The row dimming multiplies with it, so a row that is not
  being pointed at takes its year to 0.12 — again the reference's own figure.

- **The footer's foot row is anchored to the bottom, not to its design `y`.**
  In the 800-tall frame the copyright, the button and the socials sit at y 734,
  718 and 755 with heights 34, 50 and 13 — every one of them ends at 768, a
  flat 32 above the foot, the same 32 the logo and the masthead keep from the
  top. The block is `min-h-lvh` rather than 800 tall, so anchoring them by `y`
  left the row floating: on a 900-tall screen it sat **166** above the bottom
  while the top row kept its 32. Now all three clear the foot by 32 at every
  height. The panel's own accent edge was even all along — 16 on all four
  sides, measured — so it was the row inside it that was off.

- **The footer has no accent edge along its foot, and never did.** The figure
  is not inside the panel: the suit runs to 809.8 in an 800 frame, so it hangs
  past the bottom and covers the edge there. Clipped inside the panel it left a
  cyan strip the design does not have. Found by diffing my render against
  Figma's row by row — the bottom eight rows were the only real disagreement,
  and the columns beside them were the figure's own AMG stripes.
- **No chequered seam into the footer.** The flag joins surfaces of different
  colour; the accent edge already draws that join, and a dissolve over it read
  as a second, competing transition. Removed, as asked.
- **The hero gets its own type base between 1441 and 1920.** That range bases
  the root on **1920**, so a 1440-drawn block renders at 1440/1920 of its size —
  on a 1512 screen the masthead came out at 75.6 where it is drawn at 96.
  `[data-hero]` redefines its own Tier 2 sizes there by the full **1920/1440**.
  Two things worth keeping:

  - The correction only works if the **boxes** scale with it. 1.15 was a first
    attempt, tempered because at 4/3 "spa-francorchamps" and "118" broke onto
    second lines — but the cause was not the factor, it was three boxes sized
    in rem whose contents are type: the right-hand column
    (`data-hero-panels`), the stats plate (`data-hero-stats`) and the circuit
    map (`data-hero-map`). Multiply those three by `--hero-base` too and the
    full factor fits with nothing wrapping. Left alone, the stats plate at 4/3
    is 229px inside a 218px column.
  - The block sits **outside every cascade layer**, and it has to. The Tier 2
    tokens are on an unlayered `:root`, and an unlayered rule beats a layered
    one whatever its specificity. Inside `@layer base` the whole thing was
    silently ignored — the numbers simply did not move, with nothing to show
    for it.

  Verified over CDP at 1440/1512/1920: 1440 unchanged (column 218, eyebrow 12,
  figure 14), 1512 → column 229 / eyebrow 12.6 / figure 14.7, 1920 → column 291
  / eyebrow 16 / figure 18.7, the season block's headline unmoved at every
  width, and every panel line — "spa-francorchamps" included — still on one
  line. 1280 unchanged, being outside the band.
- **The hero's stat figures resolve digit by digit**, the way the season plate's
  and the paddock panel's do — every number on the page now arrives the same
  way. The rest of the hero was already staged: its nav, panels and actions sit
  in `Spring` wrappers with their own delays.

## 2026-08-21

- **The timeline dims a whole row, not just its plate.** The year and the copy
  are siblings of the plate rather than children of it — the year straddles the
  rail and the copy overhangs the plate's right edge by 55 — so with the dimming
  on the plate alone they stayed at full strength while the artwork behind them
  fell to 0.3. Text lying *on* a receding plate lit up instead of going with it.
  The class moved to the row; the row's own `hover:` still exempts the one being
  pointed at, because the plate is inside it. Verified: an unhovered row reads
  0.3 with plate, year and copy all going with it, and the hovered row holds 1.

- **"Keep pushing forward" — the last block, and the page's sign-off.** Ported
  from Figma node `1890:758`: a cyan page edge with a near-black panel inset 16
  inside it, the helmet centred, the logo, the masthead, a nav column, the
  copyright, a call to action and the socials. Every element measured against
  the design at its own height — masthead 1038,32 at 370x105, nav 32,291 at
  158x218, copyright 32,734 at 220, button 583,718 at 275x50, socials 1202,755
  at 206, logo 32,32 at 106x24 — all on the design's coordinate.

  The surface and the panel are **two elements**, not one with a border: the
  panel carries the artwork and clips it, and the accent has to run behind it
  right into the corners. The copy sits on the *section*, not in the panel —
  the design's coordinates are frame-relative, and nesting them in a panel
  inset 16 pushed the lot 16 in on both axes.

  Its backdrop is the **same** boolean union the paddock block ships — identical
  vector names and coordinates in Figma — so `PaddockBackdrop` is reused
  outright, drawing the hero's animated contours in white-on-black here instead
  of ink-on-light. It takes its colour from a token, so the only thing that
  changes is which token.

  Third time the same trap bit: `w-max`, not `w-full`, on the nav rows. "Next
  race" is wider than the 158 the column is given, and the text engine lays
  words out as flex items with its wrap set *inline*, so constrained it broke
  the row in two and the second line landed on top of "store".
- **The calendar's connectors crawl.** Their dashes travel **toward** the round
  being reported on — the runs to its left move right, the runs to its right
  move left — so the strip reads as the season closing on the current race
  rather than as a decoration ticking over. One crawl per 5.2s, the same
  unhurried clock the season map's ambient loops keep.

- **The call to action is a filled slab, not an outline.** Sampled off the
  Figma node's own pixels: the interior is `#090a0b` and only the 1px ring is
  accent, so on this light surface it is a dark button with cyan type. It had
  been built hollow, which read as a ghost outline. The hover flood still
  works — it is the same chamfered path, so the accent sweeps in respecting the
  cut corner instead of squaring it off.
- **The calendar's connectors were a whole position out, and solid.** Two
  separate faults, both from trusting Figma's metadata over its render:

  - The lines carry a **180-degree rotation**, so the metadata reports each
    one's x at its *end* — 542, 708, 879, 1038. Taken as starts, every
    connector shifted a position right: the first began under P4 rather than
    after P6, and the last stopped short of the final ring. Sampling the
    rendered frame put them at **416, 580, 743, 914**, each sitting ~18 clear
    of the markers it joins.
  - They are **dashed**, not solid. Counted off the render: 12 runs across the
    126-wide first connector, so 7 on and 4.5 off.

  Worth generalising: for anything Figma reports with a transform, read the
  pixels. The metadata is the pre-transform box.

- **The paddock block runs the full height of the screen.** It was pinned to
  the design's 1440x800 aspect and stopped short. The frame is 800 only in
  Figma; what the design actually fixes is where things sit relative to the
  block's *edges*, so the block is `min-h-lvh` now and each part is anchored to
  the edge it belongs to: masthead and panels to the top, the dark band and its
  calendar to the foot, and the intro column to the band — 32 above it, which
  is the gap the design really sets. The portrait is sized off the block's
  **height** (816.29 in an 800 frame, so 102%) rather than its width, which is
  how it keeps bleeding past both ends instead of stranding the head halfway up
  a taller block. Checked at 1440x800, 1440x900 and 1512x1080: fills at all
  three, band and calendar hold their design height.
- **The backdrop is the hero's, not the design's SVG.** Same call the hero
  already made — its own comment says the contours are "procedural rather than
  the Figma backdrop SVG". Same field, character for character: four sines at
  incommensurate frequencies, two diagonal, with two out-of-phase displacements
  crossing so the whole thing rolls rather than ripples; same `bgLineScale`,
  `bgLineCount`, `bgWaveAmount` and `bgWaveSpeed` off `DEFAULT_PARAMS`. It
  marches the field on a grid instead of slicing it in a fragment shader — a
  whole WebGL context for one background is not a trade worth making — and
  evaluates each vertex once per frame so every contour level reuses it.
- **The call to action and the live round move now.** Hovering the button
  floods the accent across it on `scaleX` from the left, with the label and
  arrow reversing out to the surface — the fill is the *same chamfered path* as
  the outline, so it respects the cut corner instead of squaring it off. The
  round being reported on sends a ring out of its marker every 3.2s, fading on a
  square law, on the same clock as the season map's hub ping.
- **Bracket wrappers were eating every hover in the block.** They were
  `absolute inset-0` — full-bleed and invisible — so the reveal wrapper sat over
  the whole section and the call to action never saw a pointer. Traced by
  reading `document.querySelectorAll(':hover')`: the chain stopped at the
  wrapper. `pointer-events-none` on all three.
- **The stats column drifted a pixel a row.** The design's rule is a
  zero-height line at 82 with the next row at 106; a real 1px rule with 24 above
  and 24 below makes the pitch 107, and by the fourth row the column sat 7 low.
  24 above and 23 below gives the pixel back. Re-measured against Figma at the
  design's own height: masthead 32,32/96, intro 32/338/18, call to action
  32,549/217x50, meet panel 1203,43/62/80 at 14, stat labels and figures on a
  clean 106 pitch, calendar cards at 674/691/720. What remains is a constant
  1-4px on the trimmed text boxes, which is `text-box-trim` and not drift.

- **"From the paddock" — the fourth block, and the page's return to light.**
  Ported from Figma node `1892:994` at 1:1: the portrait, the 96px masthead, the
  report and its call to action, two bracketed panels down the right, and the
  season's run along a dark band at the foot. Same `@container` unit as the
  timeline, so it is the 1440 frame at every viewport.

  Three things the design does that are worth naming. The **band is under the
  portrait and the gradient over it**, which is how the figure melts into the
  strip instead of being cut by it — get that order wrong and the block falls
  apart. The **corner brackets are one path turned four ways**, not the four
  files Figma exports; `BRACKET_PATH` runs along the top and down the right, so
  it *is* the top-right corner and the rest are rotations. And the **calendar is
  not on a grid** — each card carries its own x and width, and several names are
  wider than the card they are given, which the design lets overrun on one line.
- **The seam is the page's own chequered flag, run the other way.** The hero
  joins the season block by carrying its light surface into the dark one and
  breaking it into a flag; the timeline joins this block by carrying its *dark*
  surface into the light one the same way. `SeasonDissolve` took a `carry` prop
  rather than being cloned — the chequers and their accent are identical either
  way, only what they are cut from changes. It should be promoted out of
  `sections/season/` the next time a seam needs it.
- **The marker cannot come apart any more.** It was a CSS-rotated `<span>` hung
  off a `<div>` whose *height* animated — a layout property changing every frame
  inside a `mask-image` compositing layer, with a transform on the child. The
  geometry was never wrong: measured through a real wheel gesture, the gap
  between the line's tip and the marker's centre was 0.00 on every sample. But
  nothing about that arrangement guarantees the two rasterise from the same
  frame. The whole rail is one SVG now — track, progress line and marker as
  three shapes off one interpolation. There is no layout to lag and no second
  layer to fall behind.
- **The timeline's type animates.** Years assemble letter by letter as their row
  arrives; the copy rises a beat behind. The copy is a block reveal rather than
  a word one on purpose: it sets a bold lead against a regular remainder, and
  the engine lays words out as flex items — two runs cannot wrap into each other
  as one paragraph. The same limit decided the calendar's race names in the new
  block: the engine sets its own wrap **inline**, so no class stops a wide name
  breaking in two, and those names take a rise instead.

- **The thread stops on the last entry, not at the end of the block.** The
  design rests its marker **45 above the middle of a row** — both of Figma's
  drawn squares sit exactly there, y 93 against a row middle of 142.5 and y 432
  against 482 — so the run finishes 40.3% down the final plate, not on its
  bottom edge. `restingPoint()` works that out from the row rhythm and hands the
  rail a fraction rather than 1. Measured at the end of the page: the marker
  lands on section y 3153, which is the design's own number, 186 into a 462-tall
  plate.
- **A value cannot cross a `"use client"` boundary, and it fails silently.** The
  rail's lead was imported from the client component into the Server Component
  that lays out the rows; what arrives there is a client reference, not a
  number, so every sum built on it came out `NaN`. The spring dutifully wrote
  `height: NaN%`, the browser ignored it, and the line simply never moved — no
  error anywhere. The block's measurements live in a plain `geometry.ts` now,
  read by both sides, which also retired the `px()` helper that had been copied
  into two files.

- **The block measures itself, not the root font.** It is a `@container` now and
  every length and type size is a share of its own width — one design pixel is
  `100/1440 cqw`. Rem could not work here: the project scales the root in bands
  (`grid.config.ts`), each expecting a design authored at that band's base, and
  the only frame for this block is 1440. Three things went wrong because of it,
  all at once:

  - **Above 1440** the rows came apart. They are a *stack*, and it closes only
    because the side plate's right edge meets the centre plate's left one —
    32 + 333 = 365 = (1440 - 710) / 2. Centre plates are centred and everything
    else is anchored to an edge, so at 1920 the side plate ended at 365 while
    the centre plate began at 605, and the copy landed at 1020, **inside** the
    plate, printing the text over the artwork.
  - **Below 1280** the root stops scaling and holds at 16px, so a frame authored
    at 1440 simply ran off the screen — measured overflow at 1152.
  - **Between 1441 and 1920** the band bases on 1920, so the root *shrinks*: at
    1512 the root is 12.6px. A first fix capped the frame at `90rem` and the
    block rendered 1134 wide inside a 1512 window; the second put the layout on
    `cqw` but left type on rem, and the type fell a quarter behind its own boxes
    — the year set 28.4 where the design wants 37.8. Type had to ride the same
    unit.

  Verified across 1152 / 1280 / 1366 / 1440 / 1512 / 1600 / 1728 / 1920: fills
  the viewport at all eight, stack closed at all eight, no overflow at any, and
  at 1440 every plate still lands on its design coordinate to the pixel.

  The cost, stated plainly: the block no longer follows the page's band scale,
  so at 1512 it sits at 1.05 of the design while the rest of the page is at
  0.79. The way out is a 1920 frame from the designer, or teaching
  `grid.config.ts` this block's base.

- **The marker could not reach the end of its own rail.** It stopped exactly
  `vh/2` short — 450 on a 900 window — stranding it above the final row. The
  rule that makes the effect work is that the line's tip sits at the fold, which
  means the run finishes when the rail's *bottom* reaches the fold. The rail
  ends with the document, and a page stops scrolling once its bottom reaches the
  bottom of the window, so that last half-viewport is unreachable. The reference
  never shows this because more page follows its timeline. The run now ends on
  `bottom bottom` and completes as the page runs out; the cost is that the tip
  drifts from the fold to the bottom of the window across the block rather than
  holding at the fold. **When a block lands below this one, put `bottom center`
  back** and the exact behaviour returns.
- **The rail stopped in the wrong place, and the design said so.** Figma's line
  runs y 102 to 3429 in a 3461 frame — it finishes on the gutter, level with the
  last plate, not at the section's edge. It had been ported to `bottom-0`. Fixed,
  and it is also what keeps the marker fully visible when it arrives instead of
  hanging half off the page. The rail's fade is top-only now for the same
  reason: the bottom of this rail is the end of the document rather than a seam,
  and fading there swallowed the marker at the exact moment it landed.

- **The rail's thread, which the first pass missed entirely.** The reference
  carries *three* layers on its timeline and only one had been ported: under the
  static track there is a **progress line** in white that grows down it, with a
  **marker** turning at its tip. The line's tip tracks the **middle of the
  viewport** — its length is the distance from the rail's top to the fold, which
  is a scrub from `top center` to `bottom center`, so the marker sits at eye
  level and the white behind it is exactly how far you have read. Verified: the
  tip lands on y=450 of a 900 viewport at every scroll position, and the line
  runs 360 to 3271px.

  The marker's turn is **linear in scroll position, not velocity** — measured on
  the reference at 48.65 degrees per 100 scrolled pixels, constant to two
  decimals across equal steps and frozen the instant scrolling stops. Over this
  block's rail that is five turns, which is the form kept here so it still
  completes at any width.

  It also explains the design. Figma draws a white 9px square at two of the ten
  years, which had been logged as an unfinished macro; it is one marker drawn
  twice, a motion study. The static squares are gone and the marker travels.
- **The seam is crossed rather than hidden.** The rail reaches **260 above** its
  own section, into the tail of the season block, so the thread is already on
  screen and already moving before the timeline's content starts. With the map
  fading out over the same stretch, the two blocks are stitched by one unbroken
  line instead of butted edge to edge. The timeline dropped `overflow-hidden` to
  allow it; checked for horizontal overflow, there is none.
- **A mask on a 1px element hides anything that overhangs it.** The rail was
  `w-px` with the fade mask on it, and the 9px marker — 12.7 across once it
  turns — fell outside the mask's own painting area and never rendered. No
  error, no warning, just no marker. The masked box is 16 wide now with the
  track and the line centred inside it.

- **Blocks dissolve into their own edges instead of being sliced.** The season
  map's three dashed axes and its dot field ran at full strength straight into
  the section boundary and stopped dead — at the top under the hero, and at the
  bottom against the timeline, where the timeline's rail then *started* dead at
  the very same x. Two hard ends stacked on one line read as two slabs butted
  together rather than as one page. Both now carry a `mask-image` fade: a
  **share** on the season's backdrop, because its stage is cover-fitted and the
  fade has to scale with it, and a **length** on the timeline's rail, which is
  3461 tall and would lose a third of itself to a percentage.

  10% is the largest fade the season can take: the lap sits 13.4% down from the
  top at its closest, so the trace never enters it — verified in Chrome, the
  track and the standings plate stay at full strength while the grid and the
  dots go. The plate and the copy are outside the masked element entirely.

- **"From karts to F1" — the third block, ported from Figma at 1:1.** Node
  `2003:101`, a 1440x3461 frame: a dashed rail down the middle, ten cyan years,
  and ten chamfered plates that alternate gutter-side and rail-straddling. Every
  plate lands on the design's coordinates **exactly** — measured in a real
  Chrome, all ten at 0,0,0,0 against Figma, section height 3461 to the pixel.

  Two things made that cheap. The rows stack with **no gap at all** — 5 x 217 +
  5 x 462 + 34 above + 32 below *is* 3461 — so the frame is a plain stack rather
  than ten floating plates. And the project's root font size is already
  `1.111111vw` up to 1440, so a rem is a design pixel: the block is written in
  the design's own numbers over 16 and scales with the viewport for free.

  The plate ships as an exported SVG, twice, once per size. The two are the same
  curve at 2.13x, so it survives as **one** path — and as a path rather than an
  `<img>`, because these are content frames and an image of a rectangle cannot
  hold anything. The outline is stroked at the export's own coordinates; the
  fill and the content slot are clipped by the same curve normalised to a unit
  box, so one `clipPath` serves both sizes.
- **The timeline's motion is the reference's, measured rather than guessed.**
  Read off eladiodieste.com by driving it in Chrome: the slot's content rides
  from **-30% of its own height to 0** as the plate comes up the screen, linear,
  clamped at both ends — a scrub over `top bottom` to `top center`, confirmed
  against the reference's own -140.5px on a 468px frame. Hovering insets the
  slot 5% while the outline stays put, over 700ms on `cubic-bezier(0.33, 0, 0,
  1)` — the reference's own curve, read off its computed style — and every other
  plate drops to `opacity: 0.3`. Verified live: -30% held, then -20, -13.3,
  -6.7, 0; hover inset 23.09 x 35.48 on a 462 x 710 plate, siblings 1 -> 0.3 ->
  1.
- **`interpolate`'s transform-function branch is broken, and it fails silently.**
  `src/utils/math.ts` rebuilds `translateY(-30%)` as **`translateY(-15(%)`** — a
  stray bracket from slicing the unit off `translateY(%`. Invalid CSS, so
  react-spring keeps the last value it could parse and the animation looks
  frozen at its start with no error anywhere. react-spring's own `y` shorthand
  is no better: handed a percentage string it resolves to `transform: none`.
  The plain-unit branch is correct, so the parallax travels on `top: -30% -> 0%`
  instead. Anything driving a transform through `useSpringTrigger` needs to know
  this.

- **The lap's mask interpolation is memoised.** `lap.to(...)` sat in the render
  body, so every re-render built a fresh `Interpolation` for the mask's dash
  offset — and one of those re-renders lands exactly on the lap's finish, when
  `armed` flips for the cursor light. Rebuilding the offset from scratch at the
  moment the fill completes is the worst possible timing, so it is a `useMemo`
  now. A hard monotonic latch on the distance was tried too and reverted: the
  fill can only grow *by construction* — `lap` is a one-shot 0->1 spring on a
  monotonic easing and both `TIME_AT` and `CUMULATIVE` are strictly increasing —
  and the latch needed a mutable box that the immutability rules were right to
  reject. Verified by rendering the real mask arithmetic offline across the lap:
  dash offset 4865.6 -> 4606.8 -> 3955.0 -> 2907.6 -> 1923.3 -> 937.2 -> 228.2
  -> 60.0, never once increasing.
- **The lap ran backwards, and I put it there.** Fixed. `useSpring` hands
  react-spring a *declared* `lap: 0`, and on a re-render the library reconciles
  the spring back toward that declaration — the fill runs smoothly to empty
  over another `LAP_MS`. It lay hidden for as long as this component never
  re-rendered, and it never did. Wiring the cursor light's armed flag through
  `useState` gave `SeasonCircuit` its first ever re-render, landing exactly on
  the lap's finish. The flag is a **ref** now, read inside the halftone's own
  frame loop, so arming the light costs no render at all.

  Two dead ends worth recording. Passing `useSpring` an empty deps array does
  **not** prevent it. And the first diagnosis blamed `season-dissolve.tsx` —
  its `scrub` trigger really is bidirectional and its opaque band really does
  cover 185px of the circuit — but the seam's coverage measured 0% throughout
  the reversal, so that was wrong and the latch put on it has been reverted.

  Found only by driving a real Chrome over the DevTools Protocol from Node: the
  in-app preview pane backgrounds itself, rAF drops to zero and the lap can
  never finish, which is why weeks of reasoning about monotonic easings kept
  coming up clean. Headless Chrome ran it at 51-61fps and the shape was
  immediate — forward 4863.6 -> 60 over 6.0s, hold through the 800ms cool, then
  backward from 6.8s, the canvas trail retreating with it from 19,052 lit
  pixels to 255. After the fix: offset holds at 60 for the full trace, 0
  retreats across 144 samples, unchanged by scrolling up and back down, and the
  cursor reticle still lights (0 -> 474 lit pixels on a mouse move).

- **A third light: the cursor, as a reticle.** The halftone now answers to the
  pointer. The first pass was a round light following the cursor and it was
  rejected on sight — it is the effect every site has. It is a **reticle**
  instead: two arms running along the cursor's own lattice row and column, a
  bloom where they cross. The map already carries grid axes, a hub and corner
  ticks, so the cursor reads far better as instrumentation than as a torch, and
  because the arms are one dot thick and the field is sparse, the crosshair is
  broken by the geography it crosses — it draws the coastline as two lines of
  type rather than washing a disc of the map.

  The arms **only open when the cursor settles**: above 900 map units a second
  they are fully retracted and the reticle is just its crossing, so a cursor
  travelling reads as a point being tracked and a cursor that stops reads as a
  reading being taken. Opening is unhurried (0.38s) and shutting is quick
  (0.09s) so it acquires rather than flickers, and it resets to shut when the
  light goes out so it acquires again on the way back in.

  It still goes through the *same* lattice query the lap's hot edge uses — the
  point pass was pulled out into `addPoint`, and the arms are a straight walk
  of the same flat index, one row and one column. It stacks with whichever
  source the panel has selected; `add` keeps the brighter claim on a dot, so
  two lights crossing never sum into a blown-out patch. One thing worth
  keeping: the arms fall off **linearly** where the round lights fall off
  quadratically — a square law puts the far half of each arm under the glyph
  threshold, and a crosshair that fades out after a third of its length reads
  as a smudge rather than a line. Gated on `(hover: hover)` and off under
  `prefers-reduced-motion`.
- **The cursor waits for the lap.** It arms on the cool-down spring's `onRest`,
  so the reader meets the block's own animation before their pointer can
  compete with it. Verified both ways: 80 pointer moves over a dense patch
  during the lap light nothing at all, and the same moves after it light 345
  pixels' worth of glyphs.
- **Seven dots removed from the halftone.** A five-dot diagonal chain at
  lattice cols 96-99 / rows 0-4 and two singletons at (92, 11) and (85, 29) —
  specks in the North Atlantic that read as dirt rather than as land. The
  packed data was rebuilt around them and the round-trip asserted, 8,011 to
  **8,004**. Worth knowing for next time: 89 more dots sit in components of
  eight or fewer, and 23 of those are **trace artifacts on the grid lines** —
  lattice columns 82, 163 and 244 are `GRID_AXES_X`, and row 89 is
  `GRID_AXIS_Y`, so the halftone parse picked up dashes off the grid the map
  already draws separately.

- **The plate's frame is a stroked path, and the plate is opaque.** The chamfer
  was a `clip-path` over a CSS border, which cuts the corner but leaves the
  diagonal *unstroked* — the outline hung open at the bottom right with two
  loose ends. It is one `<path>` now, so the chamfer is an edge like any other,
  and it is filled with the surface rather than left transparent: the plate is
  an instrument reading laid over the map, not a window onto it. Dropping the
  CSS border also moved the stats 1px left, onto the design's own number — the
  border had been eating a pixel out of the grid's content box.
- **The globe turns.** It shipped as a static `<img>`; spinning it needs the
  meridian addressed on its own, which a single filled path cannot do. It is
  drawn now: limb and equator are the spin axis seen side on and never move,
  and the meridian's width runs as `cos` of the turn — the real projection, so
  it passes through the limb and goes edge-on at the poles instead of squashing.
  One revolution per 10s, paused off screen. `icon-globe.svg` is deleted and
  `public/assets/season/` with it; the block now ships no image at all.
- **One corner mark had to go.** The artwork's bottom-right tick,
  [2471.93, 1343.3], read as a stray white chip beside the plate — the backdrop
  is cover-fitted, which pins that column of marks to the section's right edge
  at every window size, and at the plate's own height it lands right against
  its border (measured 3.4px past it at 1550 wide). It is off screen at the
  design's 1440, so the desktop composition is untouched by leaving it out.

- **The type assembles, and the frame is never quite still.** The plate's badge
  and all three stat rows now resolve letter by letter through
  [[text-engine]] — figure first, its wording a beat behind, each row later
  than the last — and the intro copy went from a block fade to a word reveal,
  so the whole left rail arrives the way the headline above it does. Two
  ambient loops sit under all of it: the dashed grid crawls one dash every 7s
  and the hub pings out through the rings every 4.2s, both paused by an
  `IntersectionObserver` when the block is off screen. Neither competes with
  the lap — the ping peaks at 0.4 alpha and falls off quadratically.
- **The engine's word gap costs a line.** `TextEngine` lays words out as flex
  items and spaces them with its own `columnGap`, and the default 0.3em is
  wider than the space Space Grotesk sets: the intro wrapped onto a fourth line
  and pushed the plate 20px down. Measured the break point live — it returns to
  three lines at 0.24em and below — and set 0.22 for headroom against
  font-metric drift. Anything laid out by the engine inside a fixed-width box
  needs this checked, not assumed.

- **The cut had to reach the canvas too.** Cutting only the SVG ribbon left the
  finish still washed over: the canvas draws its glow along the whole lap *on
  top* of the ribbon, and a glow with no gap lays a cyan haze straight across
  the chequers. The same rect is now punched out of the canvas after the trail
  and its ASCII go down, and the cut widened across the track from 28 to 40
  units so it clears the 15-unit glow rather than only the 12-unit ribbon.
- **The lap stops for the flag, and runs a beat slower.** 4.2s to **6s**, and
  the ribbon is now cut at the finish. The designer's path runs straight
  through — it is one closed shape — but the frame does not: the white line
  ends bluntly on the approach, the chequers fill the gap, the line picks up on
  the far side. Uncut, the fill rode over the finish instead of arriving at it.
  The cut is 36 x 28 units, square to the track's own heading there (144 deg,
  taken off the dense centreline) rather than to the frame.
- **The flag is its own seven diamonds, not a patterned square.** A `<pattern>`
  filling a rect draws a full board; the frame's flag is a loose run of seven
  diamonds with the map showing between them, and the solid patch read as a
  different object. They were measured off the frame — their bounding boxes come
  out exactly half filled, which is what says diamond rather than square.
- **The dash is solved rather than nudged.** Pushing the offset past the path
  length to hide the mask's round cap wraps the dash pattern and reveals the
  *tail* instead — a cyan stub on the start line at rest. The run is now longer
  than the path by the mask width at each end, with the offset solved so the
  revealed length is exactly `(1 - v) x length`.
- **The halftone reads a light and turns to ASCII.** The map's 8,011 dots came
  out of the single `<path>` they were locked in — parsed straight from that
  asset, so the geometry is the same one to the last decimal — and are drawn on
  a canvas. Where a light falls, a dot crosses a threshold and is replaced by a
  glyph, denser the brighter it gets, then settles back to a dot behind the
  light. The ramp and the picker live in `ascii.ts` and are the *same two* the
  lap's hot edge uses, so the block has one ASCII effect rather than two that
  resemble each other.
- **Two lights, switched in the panel.** `edge` is the lap's own head, handed
  down as a ref and converted to map units once per frame; `wave` is a band
  crossing the map on its own schedule. SCENE CONTROLS gained a **Halftone
  ASCII** section: the light toggle plus threshold, glyph size, radius, wave
  speed and fade. It reaches the panel through a small store rather than being
  threaded down the page — the two ends are in different sections.
- **It holds the frame rate.** The resting field is baked once and blitted;
  only lit dots are touched per frame, found by arithmetic on the lattice
  rather than by search, and a faded dot leaves the active list. Measured in
  the browser at the size it runs at: **0.12ms** a frame for the edge light,
  **1.14ms** for the wave, **2.82ms** at a deliberately absurd 2,000 glyphs —
  against a 16.7ms budget for 60fps.
- **The dots asset is gone.** `world-dots.svg` (410KB) was replaced by 18KB of
  lattice indices in `map-dots.ts`; the season assets folder is now 4KB.

## 2026-08-20

- **The backdrop is vector, and the lap now fills the designer's own ribbon.**
  The raster is gone. The circuit comes from the Figma path the designer
  supplied — a filled ribbon of varying width — and the lap is revealed by
  masking it with the centreline stroked wide and its dash offset animated. So
  the cyan fill has the *designed shape* at every point instead of a
  constant-width stroke standing in for it, and it stays crisp at any zoom.
  Grid, rings, corner marks, turn markers and the chequered flag are drawn
  parametrically from measurements; only the halftone stays a file, because it
  is 8,011 dots in one path and nothing about it moves. Assets: 124KB of raster
  → a 410KB SVG that is **5KB over the wire**. See [[components/sections]].
- **The vector's position came from the raster, not the file.** The exported
  layer carries no placement, so its bounding box was fitted to the track's in
  the frame: the two axes agreed to **1.0000**, and the layer diffs at
  **0.59/255** against the raster it replaced. The lap mask is driven by an
  exact polyline length rather than `pathLength`, which not every renderer
  honours — the first attempt silently filled the whole ribbon at every offset.
- **The canvas kept only the hot edge.** With the ribbon owning the body of the
  lap, the canvas no longer draws the ground stroke, the body or the flag
  sprite — just the glow, the heat gradient, the white filament, the tip spark
  and the ASCII, over the accent. The ASCII bites are a darker accent now
  rather than the map's ground, because they land on the ribbon.
- **The map's halftone was turned into a point field, and turned back.** The
  6,862 dots were extracted and drawn on the canvas so they could sweep in and
  react to the car. On screen it read as dirty and it was reverted the same
  day; `world-map.webp` is the backdrop again. The two faults are recorded in
  [[components/sections]] so nobody repeats them: positions were stored rounded
  to whole authoring units, which is over 10% jitter on the halftone's 4.4-unit
  pitch, and the dots were drawn as hard squares where the raster's are soft
  and sub-pixel. The rule that survives is in [[decisions-log]] ADR-0025 —
  lift geometry out of a raster when it has to *move* or *stack*, as the
  circuit and the flag do; the dots do neither.
- **The season block's type re-cut against Figma; four invented tokens
  removed.** The first pass read the sizes off the frame's *raster* and got
  most of them wrong: the headline was set at 46px against Figma's **55**, the
  intro at 11px/1.72/muted against **18px/1.1/white**, the plate stats at 10px
  against **14**, the badge at 8px against **12** with the "/ 2026" half in the
  accent. With the real values in, the block needs exactly one new size —
  `--text-display-sm` (55) — and sits on `--text-lead`, `--text-body` and
  `--text-eyebrow`, which the hero already established. `--text-fine`,
  `--text-micro`, `--text-nano`, `--tracking-wide/-wider` and
  `--leading-title/-copy` are gone. Vertical rhythm now matches to within a
  pixel: `--leading-cap` reproduces Figma's cap-height text-box trim on the
  plate. The headline is also one `<h2>` again rather than one per line.
- **The chequered flag is its own layer, and the trail stops showing white.**
  The backdrop's track measures 5.75 units across and the trail was drawn at
  4.2, so the raster showed as a hairline along both edges; the trail is now
  5.9 over an 8.4-unit ground stroke, which no fringe can survive. And the flag
  — which in the design interrupts the track rather than sitting beside it —
  was being buried by the trail. It is lifted out of the raster into
  `finish-flag.png` (1.5KB, its components separated from the line by dropping
  every blob that runs off the edge of the box) and drawn back on top.
- **The ASCII head eats discs, not squares.** Clearing the whole glyph cell
  left hard corners and the head read as a row of blocks. The bites are round
  now, and filled with the backdrop's ground rather than cleared — a
  transparent hole would have let the raster's white track show through.
- **The lap closes on the flag, and the head cools when it gets there.** Two
  faults in the first pass: the traced chain ended 20 units short of where it
  started — a visible stub of unfilled white track at the finish, which is
  exactly where the eye is at the end — and the hot tip stayed lit forever, so
  the resting state of the block was a white blob parked on the finish line.
  The path now bridges those units so the last point *is* the first, and a
  second spring walks the head's colour back to the body's over 800ms once the
  lap rests.
- **The trace was re-drawn so it reads as a car, not a fuse.** The tip no
  longer widens by 15% into a match head; the bloom is two additive passes
  instead of a `shadowBlur`; the only white is a filament thinner than the line
  it sits in; glyphs dropped from 10 to 7 units so the ASCII edge is a shimmer
  rather than a row of blocks. The lap is also re-timed off the path's own
  curvature — it brakes for the corners and runs away down the straights —
  which is what the constant-speed sweep was missing. ADR: [[decisions-log]]
  ADR-0025.
- **The hero and the season block are joined by a chequered flag.** A new
  `<SeasonDissolve/>` carries the hero's light surface into the top of the dark
  block, breaks it into a chequerboard with a few cyan squares in it, and burns
  it off as you scroll — scrub-driven through `useSpringTrigger`, so it tracks
  the scroll both ways. See [[components/sections]].
- **"The season so far" ships as the home page's second block.** The screen
  prototyped in the artifact is now a real section — `views/home/sections/
  season/` — composed by the home view under the hero. The circuit fills cyan
  from the chequered flag over one 4s lap when the block scrolls into view, the
  four turn markers light as the fill reaches them, and the bright leading edge
  breaks into ASCII glyphs. See [[components/sections]].
- **The circuit is traced data, not the Figma vector.** The `Vector` layer is a
  filled ribbon with no stroke, so it cannot be drawn progressively. The
  900-point centreline in `season/circuit-path.ts` was recovered from the
  frame's raster (threshold → Zhang-Suen thinning → chain walk → 3-unit
  resample). ADR: [[decisions-log]] ADR-0025.
- **The backdrop raster is 124KB, down from 1.4MB.** The frame export was
  converted to WebP at `public/assets/season/world-map.webp` (1686×933) and is
  served through `next/image` at its intrinsic size — with `fill` the optimiser
  sizes from the viewport and picks a variant well below the source.
- **Four type sizes below `--type-eyebrow`, two positive trackings, two
  leadings.** `--text-display-sm` (46), `--text-fine` (11), `--text-micro` (10),
  `--text-nano` (8), `--tracking-wide/-wider`, `--leading-title/-copy`. The
  season plate sets type smaller than anything in the hero. See
  [[design-system]].
- **New vault note: [[components/sections]]** — a catalog of the home page's
  blocks, which did not exist while there was only one.

## 2026-08-19

- **Hero nav items re-cut from Figma** — the masthead now reads
  Driver · SEASON · journal · next race · store; `collections` and
  `Technology` are gone (Figma 823:247). Data-only change in
  `data/mocks/home.ts` — none of these routes exist yet.
- **Inter dropped; stat labels move to Space Grotesk.** The design replaced
  the face on the RACES/PODIUMS/POINTS labels (Figma 943:8/10/12), which were
  the only thing `--font-ui` was ever bound to. The token, the
  `--font-inter` binding and the whole `next/font/google` Inter family are
  removed — one fewer webfont on the page. See [[design-system]].
- **One gutter for every block on phones; trailer dropped.** The corner marks
  were hung outside the container (`-mx-4`) so they sat 24px further out than
  the button — two different edge distances on the same screen. The panels now
  keep the container's own line: frame, stats and CTA all run 24…366 at 390 and
  24…336 at 360, with the copy inset 16px inside the marks as a framed block
  should be. `WATCH TRAILER` is hidden below `sm` — the phone footer is the CTA
  alone. Both are breakpoint-scoped; the data and every width from `sm` are
  untouched.
- **Phones drop the social links; trailer joins the CTA.** With the links gone
  the trailer was left floating between the stat panel and the button, tied to
  neither. It now sits 16px above the CTA — close enough to read as one group of
  two actions — with 48px of air separating that group from the stats. A single
  row with the CTA was measured and does not fit: the trailer is 159px and the
  button needs ~200, against 342 of container at 390. The links are hidden below
  `sm` only; the data and every width from `sm` are untouched.
- **Phone footer settled on the grid.** The three items go back to the order
  the layout spec numbers them — trailer, CTA, links — each running the
  container's full width, so `INST` starts on the CTA's left edge and `YOUTUBE`
  ends on its right (24 and 366 at 390). The short-lived merged row and the
  stacked column both floated at a width of their own and broke that line.
  `X` stays dropped below `sm`, matched by `label.length === 1` so the rule is
  about the shape of the label rather than one platform; the data and every
  width from `sm` are untouched, so 1440 is unchanged.

  The plane-edge band reappeared once the portrait grew: the ramp ended at
  y=1006 and the smear sits at ~1010, a four-pixel miss. It now reaches 208px
  past the box (`-bottom-52 h-[26rem]`), turning solid 42px below it, which
  clears the smear with room and keeps 250px of fade.
- **Phone pass 2: tighter stack, merged footer row, bigger name and portrait.**
  Block gaps 40 → 32; the scene band `52svh` → `58svh` with the cap at `135vw`.
  The name gets `--text-display-lg`, a new 70px step between `--type-display`
  (52) and `--type-impact` (96) — measured, not guessed: `ANTONELLI` in Oswald
  Bold is 225px at 52px, so 79px is the most that clears 390's gutters and 72px
  the most that clears 360's. 70 leaves headroom on both.

  `WATCH TRAILER` and the social links now share one line on phones, which buys
  back a row of height. They are wrapped in a div that goes `contents` from
  `sm`, so all three footer items return to the desktop grid and `order`
  restores trailer · CTA · socials. The row only fits with the label set
  `whitespace-nowrap`, the row gap at 16px and the social gap at 24px rather
  than the spec's 32 — worth flagging, 32 forces the label onto two lines.
- **Phone bottom section built to spec.** 24px gutters (`px-6`), every block on
  that line, 40px between all four blocks, rails full width so the right-hand
  dead strip and the clipped corners are gone, circuit at 100x70 flush to the
  container's right edge and centred on the copy, stat row three equal columns
  starting at 24, play button 44x44, CTA full width at 56, socials 32px off the
  foot. Corner marks sit 16px outside the copy via `-mx-4 p-4` on
  `BracketPanel`, so the frame's own 22px inset is untouched from `sm`.

  Two answers to questions in the spec. The black band over `BELGIAN GP` is not
  an element — nothing in the DOM there has a background. It is the subject
  plane's bottom edge, where the texture's last row smears; invisible at
  desktop because it falls off-screen. The phone ramp is stronger now to land
  the portrait before it. The circled `N` is Next's dev indicator, which never
  ships; moved off the socials with `devIndicators: { position: "top-right" }`.

  One constraint in the spec cannot hold at 360: copy at 24px, 16px of clear
  space, and a 10px corner mark need 26px of gutter and there are 24. The marks
  currently clear the map by 6px. Needs a call — see the note to the designer.
- **390x844 rebuilt — three separate faults, all fallout from the full-bleed
  canvas.**
  - *Portrait on the copy.* The 7rem overhang that crops the scene's headroom
    is a quarter of the box on a phone, so it put the head in the meta rows.
    It is `3rem` below `md` now: enough to take the dead air off the top,
    not enough to climb into the text. Band up to `52svh` with the cap loosened
    to `120vw`, since shoulders reaching the edges is what desktop does too.
  - *Rails on the suit.* Phones stack the rails under the portrait, and the
    canvas no longer clips at the box, so the shoulder ran on behind
    `NEXT RACE`. A ramp inside the spacer lands the portrait first; the spacer
    only needs `md:overflow-hidden` now, so the ramp can hang past its foot.
  - *A grey wash over everything below the fold.* The cursor reveal is parked
    at a fixed point on touch — harmless when the canvas was the band, but
    across a full section it sat behind the rails and the footer. Zeroed under
    `md` via the existing `bgRevealOpacity`: there is no pointer and no subject
    down there for it to reveal.

  The frozen springs came back too — 0.52 this time. Hoisting the targets was
  not enough because the cause is the render, not the literals: measuring the
  box into React state re-rendered the hero on every resize tick. The
  measurement is refs only now and the scene reads them on its own resize pass
  (`fitTo`), so the hero renders once. `Spring` itself is `#do-not-modify`, so
  this was the only place the fix could go.
- **Fallout from the full-bleed canvas: ramp re-anchored, frozen springs.**
  Two things broke when the canvas stopped being the portrait's band.
  - The white ramp was a child of that band, so once the canvas ran to the foot
    of the section the portrait carried on past the ramp and the footer landed
    on the black suit. The ramp now sits at the section's foot.

    Sizing it took three passes. A 256px ramp with the stop at the midpoint
    left only 128px of fade, which read as a cut. Lengthening the ramp to
    `32rem` smoothed it but started 512px above the foot and ate into the
    portrait's face. What actually matters is where the stop sits, not how tall
    the ramp is: `h-64` with `via-90%` keeps the start at 256px — close to the
    original — while stretching the fade itself to 230px.

    The footer's ground is not uniform, and does not need to be. Where the
    portrait reaches the foot (768 and 1024, subject ending 34px up) the rows
    sit on 79–94% background, which reads cleanly because the portrait is
    already mostly faded there. On a phone the subject ends 534px above the
    foot — there is nothing behind the rows at all.
  - `driver_012` and the meta rows froze at opacity 0.331. The measurement
    effect re-renders the hero, and `Spring` hands `from`/`to` straight to
    `useSpring`, so the inline literals in `driver-identity.tsx` re-seeded the
    animation every frame — the same trap the burger sheet hit. Targets are
    module constants now, and the box measurement is rounded so sub-pixel
    wobble cannot trigger a render at all.
- **More air under the headline** — the driver block's gap goes `md:gap-16`
  (24px → 64px). `xl` keeps its own `6.0625rem`, so 1440 is unchanged.
- **Scene canvas goes full-bleed at every width; subject fitted to a box.**
  The backdrop plane is rescaled to the frustum each frame, so its animated
  contours can only reach as far as the canvas does — below `xl` the canvas was
  the portrait's band, which meant 65% of the block moved and the other 35%
  was a still vector. The canvas now spans the whole section.

  What kept that from being possible before is that the subject's pixel size is
  a function of canvas height, so stretching the canvas stretched Kimi with it
  (1.38x at 1024x820). That is now decoupled: `fitSubjectToBox` in `scene.ts`
  takes the box the portrait *should* occupy and returns corrected
  `subjectScale` / `subjectY`. The subject scales about its own origin and the
  world-to-pixel factor is proportional to canvas height, so the size term is
  the plain ratio of the two heights; the position term is the box's centre
  moving relative to the canvas's, converted back to world units through
  `2 · cameraZ · tan(fov/2)`. `CAMERA_FOV` and `CAMERA_Y` are exported for it.

  The box is a real element in the flow (`boxRef`), measured with a
  `ResizeObserver` — the layout decides how big the portrait is, not a
  constant. It carries `xl:hidden`, so from `xl` the box and the canvas are the
  same thing, both terms collapse to identity and the scene runs uncorrected:
  **1440 needs no special case and is verified unchanged** (canvas 860 = section
  860, fit disabled, headline 96px, one screen). The vector backdrop is back to
  bot-path only.
- **Tablet rails move opposite the driver block.** They had been centred on
  the scene band, which put dark copy over the dark suit — `NEXT RACE` and
  `SEASON STATS` were starting to sink into the shoulder — while the ground
  beside the headline sat clean and empty. From `md` they share a row with the
  driver block instead, and the portrait keeps the full width beneath them.
  Both ends are `contents` wrappers so the phone stack and the frame's own
  three-part row are untouched.

  The stacking order needed care: `order-*` on a `contents` wrapper does
  nothing — the wrapper is not a flex item, its children are — so the band
  briefly jumped above the headline on phones until the class moved onto the
  band itself. Verified: phone reads headline → portrait → stats; 1024 puts
  the rail at 112px against the headline's 126px, clear of the band; 1440 is
  unchanged at rail 1190–1408, canvas 1440x860, identity 417px, one screen.
- **Hero: air above the driver block, backdrop restored below `xl`, fade
  stripe dropped, subject larger again.** Four asks off a design review:
  - `md:pt-12` puts 48px between the masthead and `driver_012`; the two were
    nearly touching.
  - The vector backdrop is rendered again below `xl`. Making it bot-path-only
    fixed the doubled lines at desktop but left the tablet and phone hero with
    no contour art outside the scene band — the block read as blank. It now
    carries the block below `xl` and stays hidden from `xl`, where the scene
    is full-bleed and would double it.
  - The white ramp at the band's foot **stays** — it is what keeps the copy
    legible over the portrait. Only the thin dark line at the very edge was
    unwanted: at a fractional canvas height a sliver of un-faded canvas showed
    below the gradient, so it is now pinned a pixel past the edge
    (`-bottom-px`) and raised to `h-40` to cover the footer row.
  - The portrait fills the block below `xl`. The band runs `104svh` at `md`
    and `112svh` at `lg`, the cap is relaxed to `max-h-[100vw]` so the
    shoulders may reach the edges as they do at desktop, and the footer is
    pulled over its foot with `md:-mt-16`. The scene also leaves headroom
    above the subject, which read as dead space under the meta rows — the
    canvas now overhangs the band by `7rem` and is anchored to its foot, so
    that headroom is cropped and, since canvas height sets subject size, the
    portrait grows with it. At 1024x820: band 918px, canvas 1030px, subject
    ~1186px wide against a 1024px viewport.
  - Band up again to `84svh` at `md` and `96svh` at `lg` (787px at 1024x820).
    `max-h-[86vw]` still guards the shoulders on narrow viewports.
- **Tablet: rails move beside the portrait, subject grows to fill the room.**
  The rails used to take a block of their own under the scene band while the
  space either side of the portrait sat empty. From `md` they are pinned to
  the right of the band instead — a 13.625rem column, the same one the frame
  uses — and the height that frees goes to the subject: the band is now
  `76svh` at `md` and `88svh` at `lg`, up from `64/72`. At 1024×820 the band
  went 553px → 722px while the page got *shorter*, 1297px → 1233px. The
  column's vertical rhythm also tightens from `md` so the face is not pushed
  under the fold.

  Two things worth knowing. `max-h-[86vw]` caps the band: the subject draws
  about 1.15x as wide as the band is tall (the camera's vertical FOV is fixed,
  so height sets both), and without the cap a tall band on a narrow viewport
  cuts the shoulders off — at 390 it lands exactly on the viewport width. And
  the wrapper that groups band and rails is `xl:contents`, so it dissolves at
  desktop and the frame's own three-part row is untouched — verified at 1440:
  canvas 1440x860, rail 218px ending at 1408, panel 218x190, identity column
  417px, still one screen.
- **Tablet masthead is a burger; background lines de-duplicated.** Five
  changes to the sub-`xl` hero:
  - The nav collapses into a burger below `xl` (`hero-nav.tsx` is now a client
    component). The scrollable strip it replaces hid `next race` and `store`
    behind an edge with no affordance. It opens a **full-screen sheet**, not a
    dropdown — the first pass hung a cramped list straight off the button, so
    the trigger and the links were touching. The sheet sets the six
    destinations in `--type-display`, staggers them in, locks Lenis through the
    `useScroll` store, closes on Escape / link / the X, and force-closes when a
    resize crosses `xl`.

    Two traps worth recording. The sheet is portalled to `body`: the masthead
    animates on a spring, and a transformed ancestor makes `position: fixed`
    resolve against *it* rather than the viewport. And its `from` / `to` are
    module constants — `Spring` passes them straight to `useSpring`, so fresh
    object literals per render re-seed the animation every frame and it parks
    partway instead of arriving (it sat at opacity 0.278 until hoisted). The
    rest of the codebase already does this with `REVEAL_FROM` / `REVEAL_TO`.
  - **Two sets of background lines** were drawn at once: the scene's backdrop
    plane animates contours with a wave and pointer parallax, and
    `backdrop-lines.svg` sat over it nailed down — hence "some lines move,
    some don't". The SVG is now the bot path only.
  - The headline reaches its designed `--type-impact` from `md` instead of
    `lg`. A tablet at 1024 with a classic scrollbar reports 1009px, missed the
    `lg` query and fell back to the small step.
  - The scene band grows to `72svh` at `lg` — a larger portrait on tablets.
  - The CTA is centred by a `1fr auto 1fr` footer grid rather than by
    `justify-between` plus `self-center`, so it sits on the page's centre line
    at every width. At 1024 it was 8px off; it is now exact, and 1440 is
    unchanged at 720.
  - Masthead raised to `z-30`: the burger panel drops out of the header and
    the headline, a sibling in the same stacking context, painted over it.
- **`suppressHydrationWarning` on `<body>`.** Browser extensions add
  attributes to `<body>` after the server HTML is sent (ColorZilla's
  `cz-shortcut-listen`, password managers), which React reports as a hydration
  mismatch on every load — the dev overlay's standing issue. The flag covers
  that element's attributes only; real mismatches inside the tree still report.
- **Driver rails rebuilt below `xl`.** In the stacked range the two bracket
  panels were grid cells stretched to half the row, so the corner marks sat
  far from copy that hugged the left — at 1024×768 the next-race frame was
  367px wide around 118px of text, and the stat row spread `RACES / PODIUMS /
  POINTS` across the full cell. Three changes: the rail is now a flex row
  whose panels size to their content; the circuit map moves beside the copy
  instead of under it, which drops the panel from ~180px to 112px tall and
  spends the empty half of the frame; and the stat row keeps the frame's
  10.75rem width at every size, not just at `xl`. Desktop is untouched —
  verified at 1440: rail 218px, panel 218×190, stat row 172px, map still
  below the copy at a 28px offset.
- **New `subjectX` scene param (default `0` — no visual change yet).** The
  figure reads as leaning left. Measured against the source texture rather
  than by eye: in `person-diffuse.webp` (2048²) the head sits ~43px left of
  centre while the shoulders sit ~14px right of it — the photograph itself is
  asymmetric, and `subjectGroup.position.x` had no base offset at all, only
  pointer parallax (max ~4px, far too small to explain it). Added `subjectX`
  alongside `subjectY` and wired it into the controls panel as the lever for
  this.

  It ships at `0` because centring the head is not free: the subject is one
  plane, so the shoulders travel with it. At 1280×800 the shoulder's right
  edge already sits ~8px from the `INST` link, and the +0.09 that centres the
  head (~19px) pushes the black suit under the social row and makes it
  unreadable. At 1440×860 the same offset clears it by ~23px. The two can
  only coexist once the subject's scale is driven by viewport *width* rather
  than *height* — see [[decisions-log]] ADR-0024.
- **Landscape phones get a `short` variant.** At 844×390 the hero's stack
  pushed the scene band to y=422 in a 390px-tall viewport — the subject never
  reached the first screen at all. A height-keyed `@custom-variant short
  (max-height: 500px)` now tightens the headline to `--type-heading` and
  compresses the vertical rhythm; the band starts at y=275 and the portrait
  is visible without scrolling. Keyed on height, so no desktop, tablet or
  portrait phone is affected.
- **Breakpoint sweep: two adaptation faults fixed.** (1) The scaling grid was
  discontinuous — the phone range reached to 640px while being based at 360px,
  so the root font-size read 10.0px at 641px and 28.4px at 640px, a 184% jump
  on one pixel. Below `xl` the type scale now holds at the 16px base. (2) The
  desktop overlay only fits from ~1280px: at 1024×768 the portrait crossed
  into the headline, `driver_012` was hidden and the footer row collapsed. The
  overlay now starts at `xl`; 1024–1279 uses the stacked layout, with the
  headline keeping its designed `--type-impact` from `lg` up. Desktop 1440 is
  untouched and verified identical. See [[decisions-log]] ADR-0024.
- **Hero scene band now scales with the breakpoint below `lg`.** The camera's
  vertical FOV is fixed, so the subject's on-screen size tracks the band's
  height; a single `40svh` band sized for a phone left the portrait small on
  tablet widths. It is now `40svh` / `sm:52svh` / `md:64svh` — at 932×850 the
  canvas goes 340px → 544px. Desktop is untouched: from `lg` the band is still
  the absolute full-bleed backdrop.
- **Type and colour re-checked against every text layer in Figma 823:247.**
  Two drifts fixed: the social links were 13px but the frame sets them at 14px
  like the rest of the panel body — `--raw-font-size-13` / `--type-caption` /
  `--text-caption` are retired, since nothing else used them and the frame has
  no 13px type; and body copy was pure `#000000` where the frame uses
  `#090a0b`, so `--raw-color-ink-950` and `--raw-color-ink-alpha-35` now carry
  the frame's value. Every other text layer — nav, garage, driver_012, the
  name, meta rows, panel eyebrows, race details, stat labels and figures,
  trailer, CTA — already matched on face, weight, size, leading and tracking.

## 2026-08-04

- **Outline is now a wave *train*.** A wave is spawned every
  `outlineStagger` seconds and lives `outlinePeriod` seconds, so several are
  in flight at once and the helmet is disclosed continuously instead of once
  per cycle. The loop walks back from the newest spawn and breaks at the first
  one older than its period, so it costs only as many iterations as there are
  live waves; set `stagger >= period` and it collapses to the previous
  single-wave behaviour exactly. Combined with `max` rather than a sum —
  waves travel the same way at the same speed so they never actually meet,
  and summing would blow out if they ever did.
- **Cursor parallax on the whole composition** — `subjectParallax` slides the
  portrait and helmet together with the pointer. Distinct from the two that
  already existed and easy to confuse with them: `headParallax` shifts the
  portrait's UVs against its own depth map, `helmetFollow` moves only the
  helmet. This one moves the pair bodily, as one matrix on the group rather
  than a per-child walk (optimize-3d-scene §9). Shipped far subtler than it
  was built — it reads as the composition breathing with the cursor, not
  tracking it, and a value that looks reasonable while tuning is too much at
  a glance.
- **Loader inverted to the page's own ground**, so the lift is a fade between
  identical colours and never a flash: faint dark helmet shell, solid dark
  fill, dark name, meter track a shade darker than the ground. Its exit is now
  **three beats** — the loader's content clears, a 240 ms beat of empty
  ground, then the veil lifts as the page's entrance begins. Fading the helmet
  out *through* the arriving hero put two unrelated animations on screen at
  once and read as a glitch. Traced: content 1.00 → 0.01 while the veil holds
  at 1.00, veil starts lifting only after, with the nav rising alongside it.
- **The idle sweep got its own warp and length** (`sweepWarp`,
  `sweepLength`), split out from the cursor's. It is the trail worth making
  cheap: it runs unattended and constantly, whereas the cursor's only costs
  anything while someone is moving it — and nobody studies the sweep's edge
  closely enough to miss the detail. Shipped at roughly half the cursor's warp
  and half its history.
  - The warp is now **branched**, so a trail with `warp` at 0 skips its two
    noise fetches per fragment entirely rather than multiplying them by zero.
  - `writeTrailBounds` takes the length and warp per trail. The box has to
    match the loop it guards — too small and it clips the mask, too large and
    it stops rejecting anything.
- **Two overlapping reveals made affordable — three exact early exits.** With
  the cursor and the idle sweep both open the mask ran two full loops per
  fragment. None of these changes a pixel:
  1. A link's contribution is `weight × smoothstep(…)`, so `weight` is its
     ceiling, and `weight` falls monotonically with age. Once it drops to what
     the running maximum already holds, **no remaining link can beat it** —
     break. This fires almost immediately inside the solid core of a stroke,
     which is exactly where the loop used to run to full depth.
  2. Past `threshold + edge` the final smoothstep saturates, so a larger value
     is indistinguishable — break.
  3. `revealTrail` short-circuits instead of `max()`: where the cursor already
     reveals fully, the sweep's entire loop is skipped. That is precisely the
     overlap region that was costing.
- **Original helmet livery restored** at the owner's request, pending a proper
  replacement. `scripts/recolor-helmet.mjs` still emits the de-branded
  `helmet-carbon` / `glass-neutral` atlases — swapping two `loadTexture` lines
  brings them back. Material returned to its livery tuning (`metalness 1`,
  `roughness 0.35`, `envMapIntensity 1.3`); the flat-grey values existed only
  for the de-branded shell. [[decisions-log]] ADR-0022 still records what the
  de-branding costs and why both atlases need it.
- **Resize across a breakpoint no longer leaves the canvas stretched.** Two
  bugs, both in the same effect. It gated on `tier.mobile`, so a desktop
  window that merely *started* narrow was classed mobile for the whole session
  and then never resized — widening past `lg` moved the layer from an in-flow
  band to a full-bleed backdrop while the drawing buffer kept its old
  dimensions. And it watched the window, when the *container* is what changes
  at that breakpoint. Now a rAF-coalesced `ResizeObserver` on the container,
  gated on the new `coarsePointer` flag — the iOS URL-bar hazard the old rule
  guarded against belongs to touch devices, not to narrow windows. `retune()`
  re-reads the tier and applies DPR and frame budget live. Verified: opened at
  420×900, widened to 1440×800, buffer tracks the CSS box exactly.
  **`trailSamples` deliberately does not update** — it is baked into the
  shader source, so honouring it would mean recompiling every material
  mid-session; a dragged window keeps the shorter trail until reload.
- **Performance pass, per the `optimize-3d-scene` skill.** Measured on a
  production build at `next start`; counted quantities only (§0).
  | | before | after |
  |---|---|---|
  | JS to a crawler | 1332 KB | **640 KB** (no scene chunk) |
  | Shader programs | 8 | 8, **stable** across interaction |
  | Mask loop bound, mobile | 72 | **28** |
  | Horizontal overflow, 360→1920px | — | **0 at every width** |
  - **§2 tiering rewritten.** `device.ts` gained a **tablet** tier, plus
    `prefersReducedMotion`, an `isEnergySaver` proxy (`saveData` /
    `deviceMemory ≤ 2`, the nearest thing to iOS Low Power Mode) and a
    combined `freeze` flag. The settle path reads `freeze` now, so an
    energy-constrained phone also plays the entrance and then stops drawing.
  - **§7 the real mobile lever: `trailSamples` is per tier** (28 / 44 / 72).
    The reveal mask is a per-fragment loop evaluated over a *full-screen*
    plane, now twice per frame, so its length is paid for across the whole
    frame. It sizes a uniform array and a loop bound, so it cannot be a
    uniform — the shader source is built at construction from the tier.
  - **The mask early-outs on the gate before the bounding box.** Below the
    pace gate a trail contributes nothing, so the whole loop is skipped for
    whichever trail is resting — which for the cursor is most of the time.
  - **DPR held at 1 on mobile**, not the skill's 0.85: this scene draws
    hairline backdrop contours and a helmet wireframe, and sub-1.0 aliases
    both (§6's hard-edged-geometry exception).
  - **§1 bot list widened** from 9 substrings to auditors + crawlers + social
    scrapers + generic `bot`/`crawler`/`spider`. A false positive costs one
    visitor a static poster; a false negative costs a Lighthouse score or a
    blank share card.
- **Metadata, favicons and Open Graph wired to the design.**
  `scripts/generate-open-graph.mjs` builds a 1200×630 share image from the
  hero's own portrait and wordmark, plus the whole favicon set from a GRIDO1
  mark — including a real `.ico` (hand-built container around a PNG payload,
  since sharp cannot write ICO) that replaces the starter's
  `src/app/favicon.ico`, which is the App Router convention and wins over
  anything in `public/`. `siteConfig`, `manifest.json` and the JSON-LD graph
  all re-pointed; the graph gained a `Person` node so it says who the site is
  *about*. Fixed alongside: the OG `images` entry declared 900×600 for an
  asset that is 1200×630, which makes scrapers reserve the wrong box.
- **Idle sweep** — with the cursor still, a synthetic pointer traces three
  descending strokes (right, left, right) across the face every
  `autoSweepPeriod` seconds, so the reveal keeps playing on a static page. It
  writes `this.pointer`, the same target a real cursor writes, so smoothing,
  pace, trail and gate all treat it identically — a parallel code path would
  have had to re-derive every one of them.

  **Reworked the same day into a fully independent second trail.** Borrowing
  the cursor's pointer meant the two could never overlap: moving the mouse
  suppressed the sweep. It now carries its own pointer, history, bounds and
  pace, and the mask is the union of the two, so a cursor stroke and a sweep
  can be open at once. The shader body is generated once per trail
  (`revealTrailFunction`) because GLSL ES cannot take a uniform array as a
  function parameter. The path is three descending diagonals — top-left to
  the right, back down-left, down-right again — eased **ease-out quad** per
  stroke, not smoothstep, which eased *in* too and made every stroke start
  apologetically. On the cycle wrap the whole sweep state is snapped back,
  including its history, or the smoothing would glide across the gap and draw
  a fourth stroke back up the diagonal. Params: `autoSweepAmount`
  (0 disables), `Period` (5s), `Stroke`, `Hold`.
- **Fixed: the helmet never appeared on touch devices.** The pace gate landed
  with a comment claiming touch tiers were "pinned at full pace", but nothing
  ever set it — `pace` stayed 0, so the gate held the reveal shut forever and
  those devices saw no helmet at all. Pace is now measured whenever *anything*
  drives the pointer, which on touch is the idle sweep; if the sweep is turned
  off on such a tier, `pace` falls back to 1 so the helmet is at least present
  rather than silently gone.
- **Page loader + staggered content entrance** — `hero/hero-loader.tsx`, a
  full-bleed veil that holds the page until the scene reports `ready` (after
  every texture upload and shader compile), then fades and hands over. The
  rails stagger in behind it — nav 0ms, identity 180, panels 900, actions
  1500, each on a ~1.4s spring, so the whole reveal lands just under the 3s
  budget. Content stays **mounted** under the veil rather than being
  conditionally rendered: it is the page's real markup and should not wait on
  a WebGL prewarm for crawlers or assistive tech.
  - The meter is a spring re-targeting, not a fill animation — no keyframes
    are permitted. It creeps to 70% under a very soft spring and completes
    under a stiff one when the scene lands. Toggling `enabled` can only ever
    give two states, so the *target* moves instead.
  - It reports 70%, not 100%, while loading, because there is no real
    progress figure to report and a full bar over a still-compiling scene
    would be a lie.
  - The driver name reveals word-by-word through `TextEngine` — see
    [[decisions-log]] ADR-0021 for why it runs without `overflow`.
  - **Redesigned the veil itself:** the helmet silhouette filling
    top-to-bottom, the driver's name easing in beneath it, and a full-width
    4px meter along the bottom edge. *(Built dark first, on the reasoning that
    a white fill needs a dark ground; reversed later the same day — see the
    entry above. Matching the page's ground turned out to matter more, because
    it makes the lift a fade between identical colours instead of a flash.)*
    The helmet is a **CSS mask derived from `helmet.png`'s alpha**
    (`scripts/recolor-helmet.mjs` → `helmet-mask.png`), not hand-drawn: the
    photo is already a clean cut-out, so its alpha *is* the shape, and masking
    a container keeps the fill a plain rectangle that a spring can drive. The
    mask is **trimmed** first — `mask-size: contain` fits the file including
    its transparent margin, which rendered the helmet at a fraction of its box.
- **The composition rises into place as the veil lifts.** It starts low and
  eases up to its framing on an ease-out quad, so the arrival is the part you
  notice. Triggered by the loader's handover — the same instant the veil
  begins to fade — so the two are one movement rather than a curtain opening
  on a static frame. Amplitude and duration are `riseDistance` /
  `riseDuration`; read `DEFAULT_PARAMS` for the shipped values.
  - **`riseDistance` is in CSS pixels, not world units**, so it is the same
    apparent travel on every screen. Converting needs the frustum height at
    the subject's depth, which moves with `cameraZ`, so it is resolved per
    frame against the canvas' CSS height rather than baked once.
  - The drop is held in full until the handover fires; settling into place
    behind the veil would spend the gesture where nobody can see it.
  - Skipped entirely on `freeze` tiers, along with the rest of the motion.

  Verified by tracking the subject's vertical centroid across the entrance:
  it travels up and decelerates to a flat stop. Note the measured travel runs
  a little above `riseDistance` — the burn and the idle sweep also shift dark
  pixels inside the sampling window, so treat it as confirming the shape of
  the movement, not as a calibration of its amplitude.
- **Fixed: the loader's veil vanished mid-fade.** The real cause of the
  flicker at the end of loading, and it was a plain mistake — the veil's
  opacity is driven by a **spring** but the element was unmounted on a
  **timer**. A spring approaches zero asymptotically and has no fixed
  duration, so a 700 ms delay removed it while it was still visibly there: a
  step from a few percent opacity straight to nothing. It now unmounts when
  the *rendered* opacity drops below ~1/255 (polled per frame while lifting,
  with a 3 s backstop for a backgrounded tab, where rAF pauses). Measured
  leaving at 0.004 opacity — under one 8-bit step, so removing the element
  cannot change a pixel. **Do not pair a spring with a fixed unmount delay;**
  there is no delay that is correct for both a fast and a slow settle.
- **Fixed: the burn flickered.** Two defects in the glow, both found by
  reading the shader after a luminance trace showed the frame-to-frame signal
  reversing direction (144→145→143→140→136→144).
  - The glow was a **second gaussian over `burnAt`**, a *noisy* field, with
    its own width. At a tight `burnSoftness` the glowing pixels were a scatter
    that re-rolled every frame as the front crept — sparkle, not a moving
    edge. It is now `4 · intact · (1 − intact)`, which peaks exactly at the
    dissolve boundary, is pinned to the real (ragged) edge, and can never be
    noisier than the dissolve itself.
  - It was gated by `step(0.001, uIntro) · (1 − step(1, uIntro))`, which
    **snapped the glow off the instant `uIntro` hit 1** and popped. `intact`
    is already 0 once the burn has passed, so the term now retires on its own.
  After: **zero sharp direction reversals** over the same trace; what movement
  remains is the intended sweep and outline pulsing.
- **Sweep brush size is its own param** (`sweepRadius`), alongside its warp
  and length — the idle sweep is now fully independent of the cursor's shape.
  `writeTrailBounds` takes the radius per trail too, since the margin has to
  match the brush the loop actually uses.
- **Fixed: polygons visible through the visor for the first second.** The
  outline wireframe was drawn over the still-solid helmet during the entrance.
  It exists to disclose an *invisible* helmet; over an opaque one it is a
  wireframe laid across paint, and the semi-transparent visor made it worst of
  all. It now fades in on the burn's own curve (`burnProgress`, mirroring the
  shader's `smoothstep(uBurnStart, 1, uIntro)`), so the shell dissolving and
  the outline arriving are a hand-over rather than an overlap. That also
  accounts for the contrast flicker reported with it — two competing passes
  over the same pixels.
- **Fixed: the helmet showed its own polygons on load.** `reveal` used to ramp
  0 → 1 over about a second once the scene was ready, fading the whole subject
  in. The shell and visor are `transparent` with `depthWrite: false`, so at
  partial alpha the helmet showed its own back faces through itself and read
  as loose polygons. The fade also bought nothing — the loader covers the
  entire ramp, so it was only ever visible when the veil happened to lift
  mid-way. `reveal` is now set to 1 in `load()`, **before** the prewarm
  render, so the throwaway frame is drawn at the real alpha and compiles the
  blend paths it actually uses. The scene sits finished under the veil and the
  burn is the only entrance it plays.
- **Entrance burn** — the scene prewarms, arrives with the helmet **whole and
  unmasked**, then dissolves it away and hands over to the cursor. The
  threshold per pixel is a noise lookup mixed 45/55 with height, so the front
  is ragged but still travels crown-to-chin like the outline wave; pure noise
  speckles, pure height is a flat wipe. A glowing accent-coloured edge leads
  it — without that the shell just thins out and reads as a fade, not a burn.
  Params: `introDuration`, `burnStart`, `burnSoftness`, `burnGlow`. The clock
  starts at `ready`, i.e. after `compileAsync`, so it never stutters through
  its first frames. Reduced motion skips straight to the settled state.
- **Helmet fully de-branded** — showing it whole made the sponsor decals
  obvious, and the previous "suppressed but present" recolour was no longer
  good enough. The shell atlas is now genuinely **flat** (all four ramp
  constants equal), and `scripts/recolor-helmet.mjs` gained a second pass for
  the **visor**: `glass-basecolor.webp` carried "McLaren", "Tezos" and
  "android" in full colour and had never been touched. See [[decisions-log]]
  ADR-0022.
- **Backdrop lines are solid** — the contour field moved from a noise-texture
  lookup to four analytic sines. The texture is low-resolution and tiling, so
  its iso-lines came out broken and ragged; an analytic field is continuous
  everywhere, so every line is one unbroken curve at any scale. The stroke
  derivative is now taken from the unwrapped field rather than `fract()`,
  whose jump at each integer was punching holes in it.
- **The backdrop reveal is two-tone** — the lines number the bands they
  enclose (`floor(field * count + 0.5)`), and its parity alternates the grey
  between `bgRevealLightness` and the new `bgRevealLightnessAlt`. The reveal
  now reads as the lines dividing it rather than a flat shape laid over them.
- **Owner-tuned defaults baked into `DEFAULT_PARAMS`** — copied out of the
  panel and pasted back repeatedly over the day as the effect converged.

  > [!note] `DEFAULT_PARAMS` is the source of truth for the numbers
  > Earlier revisions of this entry enumerated values and went stale within
  > hours. What is recorded here is the *character* of the shipped tuning and
  > anything a reader would otherwise misread; go to the code for figures.

  - **Framing:** the helmet sits lower and smaller on the face than the
    portrait-only fit implied (`helmetY`, `helmetScale` both down), and the
    portrait itself dropped slightly.
  - **The boundary is near-binary** — `revealEdge` is thousandths. All the
    organic softness comes from `revealWarp` displacing the sample position,
    none from the threshold ramp. Turning `revealWarp` down does not soften
    the edge, it makes it a clean disc.
  - **Blob at rest, streak in motion**, via the `trailIdleScale` /
    `trailTaper{Idle,Fast}` pace response.
  - **The movement gate ended up permissive.** An intermediate pass ran a
    high `paceThreshold` with a fast `paceAttack` — reveal only on a decisive
    flick. The shipped values reverse that: a low threshold with a slow
    attack, so it responds to almost any movement but eases in rather than
    snapping. If the helmet ever feels too eager, that pair is the dial.
  - **Backdrop:** a handful of solid iso-lines, thin, with a strong roll.

- **GRIDO1 hero built from Figma 823:247** — the page is no longer the bare
  effect. `views/home/sections/hero/` now holds the masthead
  (`hero-nav`), the driver rail (`driver-identity`), the two corner-bracket
  panels (`bracket-panel` + `driver-panels`) and the footer row
  (`hero-actions`); the scene moved behind them as a layer. Below `lg` the
  scene drops out of that layer and into the flow as a band between the name
  and the panels — one canvas, repositioned, not two. Copy and assets are in
  `data/mocks/home.ts`; UI vectors and rasters under `public/assets/hero/ui/`.
- **Re-themed to the Figma palette** — Tier 1 swapped from the Lando cream/
  green brand to GRIDO1 (`--raw-color-ice-*`, `-ink-*`, `-cyan-400`); every
  Tier-2 role kept its name, so nothing downstream changed. Type scale
  re-cut from the frame's px at the 1440 base (1px = 1/16 rem). New roles:
  `--type-body/-caption`, leading `headline/flat/cap`, tracking
  `stat/label/eyebrow`. Fonts Onest + Archivo Black → **Space Grotesk**
  (`--font-sans`), **Oswald** (`--font-display`), **Inter** (`--font-ui`).
- **Portrait swapped to `person.png`, with its maps generated** — the source
  is a plain RGBA cut-out, so `scripts/generate-person-maps.mjs` derives
  `person-{diffuse,alpha,depth,normal}.webp`. Depth is synthesised
  (silhouette inflation from a blur stack ≈ a distance transform, plus a
  face-centred bump, a shoulders-back ramp, and a skin-luminance relief
  term); normals are a Sobel of that depth, auto-scaled so the 99th-percentile
  slope lands at ~35°. The head shader gained a normal-mapped relight
  (`headRelight`) driven by the cursor.
- **Fixed the portrait rendering several stops too dark** — the diffuse is an
  sRGB texture, so the sampler returns linear values, but the head's
  `ShaderMaterial` wrote them straight to an sRGB framebuffer. three only
  injects `<colorspace_fragment>` for its own materials; the head shader now
  includes it explicitly. Pre-existing bug, visible since the swap.
- **Composition +15% and re-framed** — head and helmet moved into a shared
  `subjectGroup` so they scale and translate as one (`subjectScale 1.15`,
  `subjectY 0.42`) instead of drifting apart across two sets of params.
- **Helmet repainted to carbon** — `scripts/recolor-helmet.mjs` maps the
  yellow Monster atlas onto a narrow graphite ramp. See [[decisions-log]]
  ADR-0022 for why the supplied `helmet.png` could not become a texture.
- **Reveal reworked to a cursor trail, plus a 2s outline wave** — see
  [[decisions-log]] ADR-0021. `SceneControls` is now development-only and
  starts collapsed; it was covering the design's top-right rail.
- **Outline is a travelling wave, and the helmet is hidden between passes** —
  `outlineBase` 0 by default, so the wireframe is drawn *only* where the wave
  is. The band became a gaussian with a new `outlineWidth`; it enters above
  the crown and leaves below the chin, crossing in ~0.75 s and leaving the
  helmet clear for the rest of the 2 s cycle.
- **Reveal responds to pointer speed** — a new eased `pace` (rises at 0.25,
  falls at 0.045, full at 0.035 NDC/frame — later promoted to the `pacePeak`
  / `paceAttack` / `paceRelease` params below) scales the
  brush `mix(0.5, 1.0)` and the age falloff `mix(2.4, 0.6)`. Slow movement is
  a small blob, a fast sweep is a long strong trail. `revealWarp` now
  displaces the *sample position* rather than the accumulated value, so the
  blob kneads its own outline instead of staying a disc; raised to 0.68.
- **The cursor reveal now spans the backdrop too** — a plane behind the
  subject calls the *same* `revealTrail` the helmet materials do, so the grey
  shape on the background and the helmet shape are one shape meeting exactly
  at the silhouette. The mask GLSL moved into a shared `revealDeclarations`
  string precisely so the two cannot drift apart.
- **Background lines are procedural, animated and thicker** — the circuit
  `LineSegments` are gone. They could not be thickened at all
  (`LineBasicMaterial.linewidth` is ignored by every WebGL backend) and were
  five draws. The backdrop plane now renders contours of a scrolling noise
  field with two crossed sine displacements, giving thickness
  (`bgLineThickness`, via `fwidth` so the stroke is constant on screen) and
  wave motion (`bgWaveAmount`, `bgWaveSpeed`) as uniforms. `tracks.glb` is no
  longer fetched.
- **Trail history tripled** — `TRAIL_SAMPLES` 24 → 72 (~1.2 s at the desktop
  tick), so `trailLength` at 1.0 is a far longer trail than before. Two things
  make that affordable: the loop now `break`s past the active span, and
  `revealTrail` early-returns for fragments outside the trail's bounding box
  (`uTrailMin`/`uTrailMax`, computed per frame). Without the bounding box the
  full-screen backdrop would have run 71 iterations on every pixel.
- **Reveal is gated on movement** — a new `paceThreshold` / `paceRamp` pair
  multiplies the mask by `smoothstep(gate, gate + ramp, pace)`, so a resting
  cursor shows no helmet at all. Gating on *pace* rather than on the trail's
  value is the point: the trail under a still pointer is perfectly strong, it
  just is not going anywhere. Touch tiers pin `pace` to 1 instead, or the
  gate would hide the helmet forever where there is no cursor to measure.
- **Helmet shell repainted grey** — the atlas ramp moved from graphite
  (`0x24`–`0x33`) to mid grey (`0x56`–`0x6b`), and the material dropped to
  `metalness 0.72 / roughness 0.22 / envMapIntensity 1.35`: the settings that
  rescued a near-black shell blow out a light one. A `helmetBrightness` param
  multiplies the map through `material.color`, so the grey is tunable live
  without re-running the script.
- **Every reveal internal is now a slider** — `trailIdleScale`,
  `trailTaperIdle`, `trailTaperFast`, `trailLength`, `revealWarpScale`,
  `pacePeak`, `paceAttack`, `paceRelease`, `paceThreshold`, `paceRamp` and
  `helmetBrightness` were all hardcoded constants; the panel now has
  "Reveal — shape" and "Reveal — speed response" groups. Later joined by
  `outlineLightness` and a "Backdrop" group (`bgLineScale`, `bgLineCount`,
  `bgLineThickness`, `bgLineOpacity`, `bgWaveAmount`, `bgWaveSpeed`,
  `bgRevealLightness`, `bgRevealOpacity`) — 46 params in all.
- **Controls panel persists to `localStorage`** (`grido1:hero-scene-params:v1`)
  so a tuned look survives a reload. Three things worth knowing:
  - **Development only.** The panel is a dev rig and persistence is scoped the
    same way — a stored blob on a visitor's machine would silently shadow
    `DEFAULT_PARAMS` forever, so a later change to the shipped look would
    never reach anyone who had opened the page once. `NODE_ENV` is statically
    replaced, and the key is absent from every production chunk.
  - **Only known keys holding finite numbers are restored**, merged over
    `DEFAULT_PARAMS`. Params have been added repeatedly; a blob written before
    one existed would otherwise leave that key `undefined`, which reaches the
    shaders as a `NaN` uniform and blanks the scene.
  - **Reset removes the key** rather than storing a copy of the defaults —
    otherwise the stored copy would go on shadowing the next change to them.
  Verified end to end: fresh load stores nothing, an edit persists, a reload
  restores it into both the slider and the scene, reset clears.
- **Controls panel scrolls again** — `data-lenis-prevent` on the panel root.
  Lenis listens for wheel on the *window* and preventDefaults it, so the
  nested `overflow-y-auto` never received one and the slider list was stuck.
  The portal to `<body>` does not help here: the listener is global, not a
  DOM ancestor. Any future fixed overlay with its own scroll needs the same
  attribute.
- **Controls panel: copy/paste/reset pinned outside the scroll area** and the
  panel widened to 20.5rem. With this many groups the actions had scrolled
  out of reach and the value column was clipping the longer labels. `copy`
  is now the accent-filled primary action — tuning is only useful if the
  values can get back into `DEFAULT_PARAMS`.
- **Controls panel portalled to `<body>`** — it was rendered inside the scene
  layer, which the hero gives `z-0` so the rails paint over the canvas. That
  is a stacking context, so no z-index from inside it could beat the rails'
  `z-20` and the panel sat *under* the UI. `z-[9999]` alone would not have
  fixed it.
- **Fixed the white strip under the portrait** — the head plane's bottom edge
  sat ~14 px above the viewport. The plane is now 14% taller
  (`HEAD_EXTEND`), with the vertex shader running `v` negative below the
  image so clamp-to-edge repeats the texture's bottom row — a near-uniform
  dark suit, which reads as it running off the frame.

## 2026-07-26

- **Owner-tuned defaults baked in + paste-to-replace in the controls panel** —
  `DEFAULT_PARAMS` now carries the look tuned live in the panel. Fit:
  `helmetScale 0.74`, `helmetY 0.66`, `headScale 0.76`, `headY 0.6`,
  `headParallax 0.01`, rotations near zero, `glassOpacity 0.41`. Reveal
  (re-tuned same day to a tighter, moodier liquid): `revealRadius 0.34`,
  `revealEdge 0.13`, `revealWarp1 0.8`, `revealWarp2 0.4`, `revealSpeed 0.6`,
  `pointerLerp 0.035` — a smaller, strongly-warped blob that trails the
  cursor slowly, rather than the earlier radius-1.2 "helmet always on" pass.
  The panel gained a **paste** flow completing the round-trip: paste the JSON
  that "copy" produced (or any subset) into a textarea → apply replaces the
  current values wholesale; unknown keys and non-numeric values are ignored,
  invalid JSON shows an inline error. The reveal-radius slider max was raised
  1.2 → 2.5 since an intermediate value sat at the old ceiling. Verified
  in-browser: defaults render as tuned, and a pasted
  `{helmetScale, revealRadius}` applied live with zero console errors.
- **Scene-controls panel + bare-effect page** — the page is now nothing but
  the effect. All remaining UI removed: `SiteHeader` (and with it `PillLink`,
  `Eyebrow` — `components/ui/` is empty again), the hero's eyebrow/next-race
  card/copyright bar, and the layout's `LazyCookie` banner (also silences the
  pre-existing `/privacy-policy` prefetch 404). The mock file is down to the
  hero's name/tagline/poster. In their place: **every effect parameter is now
  live-tunable** — `HeroSceneParams` (18 knobs: camera z; head scale/y/depth;
  helmet scale/x/y/z/follow/rot; reveal radius/edge/warp1/warp2/speed/pointer
  lerp; glass opacity) with `DEFAULT_PARAMS` as the shipped look, applied per
  frame from `scene.update()`, mask constants promoted to uniforms
  (`uEdge`/`uWarp1`/`uWarp2`). The floating `SceneControls` panel
  (`hero-scene/controls.tsx`, token-styled, grouped sliders + copy-values /
  reset) writes through `setParams()` — a lightweight custom panel per the
  optimize-3d-scene skill's "don't ship lil-gui" rule; it currently ships in
  production on purpose (the owner is tuning the look — gate or remove it
  before any real release). Default helmet fit nudged per feedback:
  `helmetScale 0.94`, `helmetY +0.1` on top of the normalised fit.
- **Hero composition tuned** — the helmet now sits correctly on the head: the
  visor glass band rides the eye line (shell offset `y −0.56`, scale factor
  `0.52 → 0.56` of head height), verified against the reference screenshot
  with the cursor at eye level. The whole composition is ~15% larger in frame
  (camera `z 7.5 → 6.5`). The **poster image no longer shows to humans** — it
  flashed as a "weird image" before the scene was ready; it now renders only
  on the bot path (crawler screenshots / no-JS), while humans see just the
  scene fading in through its own reveal ramp (ADR-0020 §4 amended). A
  **copyright line** ("© 2026 Lando Norris. All rights reserved.") replaces
  the tagline text in the hero's bottom bar, fed from
  `homeContent.hero.copyright` — the tagline itself stays in the sr-only
  `<h1>` and metadata.

- **Page reduced to hero-only** — all other home sections removed at the
  owner's request: signature marquee, statement, horizontal track gallery,
  ON/OFF TRACK panels, helmets Hall of Fame, store, collabs, socials, footer —
  their section files, the now-unused `<Marquee>` / `<SectionIntro>` UI
  primitives, their `public/assets/<section>/` folders, and their content in
  `src/data/mocks/home.ts` (now nav + hero only). The page is the fixed
  header plus the 3D hero. [[components/ui]] updated accordingly.
- **Visor glass joined the liquid reveal** — the glass shell previously stayed
  at constant low opacity; it now shares the same screen-space mask uniforms
  as the gold helmet (`injectRevealMask()` applied to both materials), so
  outside the cursor mask the head is fully bare. The always-on wireframe
  overlay (a full extra helmet draw) was dropped, and the glass went
  `DoubleSide` → front faces only — both pure fill savings.
- **Hero scene performance pass** (per the `optimize-3d-scene` skill, measured
  on production builds with the §0 context-hook harness; SwiftShader-safe
  counted quantities only):
  - **The lag: the scene was rendering at ~10 fps.** `useLoop`'s
    `DEFAULT_FRAMERATE` is 100 ms, and the wrapper passed no `framerate` —
    measured **9.7 scene frames/s before → 121/s after** (display-limited)
    once the tier's budget is passed explicitly (desktop `0`, mobile
    `1000/30`).
  - **§1 bot path**: the scene is now a `dynamic(ssr:false)` chunk gated by a
    server-side `isBot()` check in the home view; the poster `<Image>`
    server-renders in `hero.tsx` and fades on scene-ready. Verified with a
    HeadlessChrome UA: **no canvas, no `.glb`/scene requests**, poster shown.
    Trade-off: `headers()` makes `/` dynamic (`○` → `ƒ`) — accepted, the page
    is a single hero and stays fast to render server-side.
  - **§2 tier module** (`hero-scene/device.ts`, feature-local): mobile =
    `<768px` or coarse pointer; drives DPR cap (mobile 1 / desktop 1.5, was a
    flat 2), frame budget, `antialias` (off on mobile), pointer listener
    (never attached on touch), and no-resize-on-touch (iOS URL-bar `resize`
    would rebuild the framebuffer mid-scroll).
  - **§3 prewarm**: every texture through `renderer.initTexture()`, programs
    via `renderer.compileAsync()`, plus one throwaway frame — all before
    `ready` flips and the poster fades. Program links: 7, all within the
    loader window (~1.1 s), none during interaction.
  - **§7 fill**: opaque canvas (`alpha:false`, clear colour read from the
    page's computed background so the brand token stays the source),
    `stencil:false`, `powerPreference:"high-performance"` on desktop,
    wireframe overlay dropped, glass FrontSide. Draws/frame **12 → 8**.
  - **Reduced motion**: entrance plays, then the scene freezes on a settled
    frame (WebGL keeps the last frame — a frozen scene costs zero).
  - Compositor-layer classes (`transform-gpu backface-hidden
    will-change-transform`) on the canvas wrapper against WebKit repaint
    flicker.
  - ADR: [[decisions-log]] ADR-0020. Known pre-existing issue surfaced while
    measuring: the cookie banner links `/privacy-policy`, which has no route —
    prefetch 404s in console (starter-era, untouched by this pass).
- **Hero interaction corrected — liquid cursor reveal instead of scattered
  slices** — first pass rendered the gold helmet as three clipped slices
  drifting off the face, which read as broken against the reference. Now the
  helmet is **worn**: aligned on the head, tracking its parallax gently, and
  hidden by default. A screen-space mask injected into its
  `MeshStandardMaterial` (`onBeforeCompile`) reveals the gold surface around
  the cursor — distance from the smoothed pointer warped by two octaves of
  scrolling noise (`noise.webp`, from the reference site's own scene assets),
  so the shell pours in and out liquid-style as the cursor moves. Clipping
  planes and `localClippingEnabled` are gone; the mask multiplies
  `diffuseColor.a`, with `renderOrder` head → helmet → glass and
  `depthWrite:false` on the transparent layers. Glass wireframe overlay
  softened (0.025). Verified in headless Chromium at multiple cursor
  positions, zero console errors; lint + build clean. ADR-0019 amended.
- **Immersive 3D hero scene** — the hero's flat helmet image was replaced with
  a three.js scene (`src/views/home/sections/hero-scene/`) rebuilt from the
  reference site's own scene assets: a **depth-parallax head** (2048² diffuse +
  depth + alpha maps driven by a custom shader responding to the pointer), the
  **glass visor shell** from the Draco-compressed `helmet.glb` (physical
  material + faint wireframe overlay; opaque shell and tear-off hardware
  hidden), the signature **"sliced visor" shards** (the gold-livery helmet
  rendered once per horizontal world-space clipping band, offset sideways, with
  a front-hemisphere clip so the visor opening doesn't expose mirrored inside
  decals), **circuit line art** from `tracks.glb` via `EdgesGeometry` (the
  outlines are thin triangle ribbons — raw `LineSegments` drew streaks), and a
  studio HDRI environment. Scene class + React wrapper split; the loop rides
  `useLoopInView` on the shared ticker (renders only in view), DPR clamped
  to 2, `prefers-reduced-motion` zeroes the pointer input, full dispose on
  unmount, and the head poster server-renders for bots/no-JS then fades out on
  ready. **New dependency: `three` (+ `@types/three`)** — see [[tech-stack]];
  Draco decoder vendored at `public/assets/hero/scene/draco/` and ignored by
  ESLint. Hero section simplified to scene + sr-only `<h1>` + next-race card;
  header now carries the stacked wordmark. ADR: [[decisions-log]] ADR-0019.
- **Lando Norris home page built** — the empty home view now carries a full
  rebuild of the landonorris.com home page, done to this starter's conventions
  end to end. Ten sections composed in `src/views/home/index.tsx` (Server
  Component) from client leaves in `src/views/home/sections/`: hero (letter
  reveal + helmet parallax between the two name lines), signature marquee,
  manifesto statement, horizontal photo drive (sticky `400lvh` scrub section),
  ON TRACK / OFF TRACK split panels, helmets Hall of Fame (hover-crossfade
  grid), store callout, partners logo wall, socials callout, and the footer.
  All copy/media flow from `src/data/mocks/home.ts` via props; assets staged
  per-section under `public/assets/<section>/` (86 files). New shared
  primitives documented in [[components/ui]] (Eyebrow, PillLink, SectionIntro,
  Marquee) and [[components/common]] (SiteHeader). Brand palette, type scale
  and radii added as three-tier tokens ([[design-system]] updated); display
  font is **Archivo Black** standing in for the reference site's licensed
  "Brier" (not redistributable). Fixed brand theme — the dark-mode Tier 2
  override was removed. ADR: [[decisions-log]] ADR-0018.
- **Gotcha captured — `SpringTrigger` transforms must be single-argument** —
  `utils/math.ts` `interpolate()` parses at most one number per value, so a
  `from`/`to` like `transform: "translate3d(0, 18%, 0)"` (or any compound
  string) emits malformed frames and react-spring throws *"The arity of each
  output value must be equal"*. Use react-spring shorthand keys instead —
  `{ y: "18%" }`, `{ rotate: "8deg" }`, `{ scale: 0.9 }` — which the util
  interpolates correctly. Noted in [[utils]] and hit live during the home
  page build (8 identical console errors, one per offending trigger).
- **Verified** — `yarn lint` and `yarn build` clean (Node 24.16); full-page
  headless-Chromium pass over every section with zero console errors.

## 2026-07-25

- **Released into the public domain (Unlicense)** — the starter now ships a root
  `LICENSE.md` carrying the [Unlicense](https://unlicense.org) and declares
  `"license": "Unlicense"` in `package.json`. Anyone may copy, modify, sell, or
  redistribute it with **no attribution requirement and no copyright retained** —
  the intent being that projects built from this starter can absorb it wholesale
  without carrying a notice. Briefly authored as MIT in the same session and
  changed before any release; the MIT attribution clause was the specific thing
  being dropped, so a recognized no-attribution licence was chosen over an
  edited MIT text. `"private": true` is unchanged, so npm publishing stays
  blocked regardless — the licence governs redistribution of the source, not
  registry availability.

## 2026-07-24

- **`optimize-3d-scene` hardened from its first field run** — the skill was run
  on a real raw-WebGL scene (no three.js, no scroll) and eight gaps came back,
  ranked by the time each cost. Fixed in `SKILL.md` and `references/patterns.md`:
  **§0** now ships a `getContext` hook so a non-three.js scene has counted
  equivalents of `renderer.info` (`draws` / `verts` / `links[]` timestamps /
  captured `attrs`) — previously §0 was unexecutable there — plus the
  *measurement environment* rules that invalidate everything if missed
  (production build only: dev's eager chunks fake a §1 failure and Strict Mode's
  double-mount fakes 2 listeners and a halved fps; kill the stale server;
  `waitUntil: "load"`, since `networkidle0` never fires against `next start`;
  SwiftShader is not a GPU, so only counted quantities transfer). **§3** now
  states that **§1 breaks it** — `dynamic(ssr: false)` pushes compilation past
  hydration, measured at 5.0 s against a loader lifting at 2.36 s — and gains a
  fifth stall cause (CPU decode/parse → **Worker**, 3.9 s measured) and the
  `as="fetch"` preload credentials trap (only `use-credentials` + `include`
  dedupes; the others silently download twice). **§5** admits `1000/30` measures
  ~26 fps given the ticker's `<=` throttle. **§7** requires a decile ordering
  check before truncating a baked point buffer (one was spatially sorted —
  truncating would have deleted half the subject). **§13** splits canvas `lvh`
  from content `dvh`. **§1**'s poster is rejustified — crawler screenshots and
  the no-WebGL fallback, not layout stability — with two crops and the
  `headers()` → static-prerender (`○`→`ƒ`) trade-off named. Unchanged on
  purpose: the cheapest-first order, the canonical-file table, and "port, don't
  invent". ADR: [[decisions-log]] ADR-0017.
- **`optimize-3d-scene` skill registered in the vault** — the new skill at
  `.claude/skills/optimize-3d-scene/` is now a first-class part of the workflow
  set, documented in [[optimize-3d-scene]] and linked from the
  [[README|Map of Content]] and [[ai-agent-guide]].
  **Routing rule (AGENTS.md hard rule #11):**
  a performance / jank / pre-ship request on a project that renders a three.js
  or WebGL scene must invoke the skill and follow its fourteen-step order — no
  improvised fix list. The vault note also maps the skill's canonical patterns
  onto primitives the starter *already* ships, so nothing gets duplicated:
  `subscribeToTicker` (`src/lib/animation/ticker.ts`, ADR-0009) is the one
  app-wide rAF loop the skill's §4/§5 ask for, `isBot()` (`src/utils/is-bot.ts`,
  ADR-0010) is the §1 bot path, the Lenis scroll store is the §9/§10 scroll
  source, `useDynamicInView` is the §4 visibility gate, and `lvh.ts` covers §13
  sizing. Only device tiering (§2) has no local equivalent. The starter itself
  carries **no `three` dependency** ([[tech-stack]] unchanged) — this applies to
  projects built from it. ADR: [[decisions-log]] ADR-0016.
- **Fixed a broken path inside the skill** — its closing "write it down" step
  pointed at `obsidian/Meta/changelog.md` / `decisions-log.md` (capital `M`, and
  an `open-questions.md` that does not exist here), so an agent following it
  would have written to a non-existent folder. Rewritten against this vault's
  actual `obsidian/meta/` layout.
- **`ai-agent-guide` gained a Skills section** — how skills are registered
  (drop in `.claude/skills/<name>/`, add a `workflows/` note, link from the MoC
  and the skills table, log in the changelog), so the next skill follows the
  same path.

## 2026-07-17

- **README — one-prompt quick start** — added a copy-paste **⚡ Start in one
  prompt** block at the top of the README: a single prompt that has Claude Code
  (or Cursor) clone the starter, detach it from this repo's git history, read the
  vault first, and run the default install. The manual [Getting started](../../README.md#getting-started)
  path stays below for anyone who prefers it.
- **Fixed: `cp .env.example .env` broke `/api/contact`** — surfaced by writing
  that step into the quick-start prompt. Copying the example leaves
  `CONTACT_ENDPOINT=` (blank), which reaches zod as `""`, and `""` is not
  `undefined` — so `z.url().optional()` rejected it. The route returned **HTTP
  400 `{"path":"CONTACT_ENDPOINT","message":"Invalid URL"}`**, misreporting a
  *server misconfiguration* as the caller's bad input. `src/env.ts` now routes
  optional URLs through an `optionalUrl()` helper that preprocesses `""` →
  `undefined`. Verified end-to-end: a valid POST now returns 200, and genuinely
  invalid payloads still return 400. Any new **optional** variable must use the
  same helper — see [[environment-variables]].
- **README — corrected clone URL & Node requirement** — step 1 pointed at
  `github.com/textura/next16-claude-starter` (wrong org — the repo is
  `textura-agency/…`), so the documented clone would 404. Also added the Node
  floor (**22.13+**; 20.19+ works, 24 LTS recommended) — below it `yarn install`
  fails outright on `eslint-visitor-keys` — and the missing
  `cp .env.example .env` step.
- **TextEngine alignment & clipping rules documented** — two failure modes that
  bite every TextEngine block, now written into [[text-engine]] (new *Alignment &
  line-height* section), [[text-engine-reference]], and AGENTS.md hard rule #3.
  **(1)** The container renders `display: flex; flex-wrap: wrap`, so words are
  flex items and `text-align` cannot position them — a lone `text-center`
  silently does nothing. Always pair `text-*` with `justify-*` on the tag
  (`justify-between` is a trap: it spreads *words*, not lines). **(2)** `overflow`
  sets `overflow: hidden` on `inline-block` wrap layers whose height comes from
  `line-height`, so tight leading shaves descenders and accented caps — keep
  leading ≥ 1.1 via the new `leading-display` token, never `leading-none` with
  `overflow`, and watch for `text-5xl`+ which ship `line-height: 1`. Both fixes
  are **classes on the `TextEngine` tag** — no wrapper component, no helper to
  import. Verified against the `spring-text-engine@0.1.5` dist source.
- **Strict three-tier token naming convention** — tokens now follow a fixed,
  portable grammar so names are predictable across every project built from this
  starter: `--raw-<category>-<name>` primitives → `--<role>` semantic →
  `--<tw-namespace>-<role>: var(--<role>)` bindings in `@theme inline`. Only
  Tier 1 holds literals; Tier 2 names purpose and is the themeable layer.
  `globals.css` restructured accordingly — **no brand palette invented**, the
  convention is the deliverable. Two deviations from the reference article,
  verified by compiling a probe against `tailwindcss` v4.3.3: primitives are
  `--raw-*` and stay out of `@theme` (a `--color-*` entry would generate
  utilities and let markup skip the semantic tier), and **`--duration-*` is not a
  Tailwind v4 namespace** — `duration-fast` compiles to nothing, so durations
  stay Tier 2 and are used as `duration-[var(--duration-fast)]`. See
  [[decisions-log]] ADR-0015 and [[design-system]].
- **Narrow CSS-transition exception** — hard rule #1 no longer bans CSS
  transitions outright. CSS `transition-*` is allowed for simple discrete state
  changes only (hover/focus colour, opacity, border, small nudges), requiring
  token-backed timing (`duration-[var(--duration-fast)] ease-entrance`),
  `transition-*` only (`@keyframes` still banned), and utilities only. Everything
  scroll-driven, revealing, staggered, or layout-affecting stays spring-based.
  A hover colour fade no longer needs a client component wrapping `<Hover>`. See
  [[decisions-log]] ADR-0014, [[animation-system]], [[design-system]].
- **New tokens** — `--raw-color-white` / `--raw-color-neutral-100/900/950`,
  `--raw-duration-fast/normal`, `--duration-fast/normal`, `--leading-display`
  (1.1 — the TextEngine clip floor), `--ease-entrance`.
- **Build & lint verified clean** — `yarn lint` and `yarn build` both pass with 0
  errors and 0 warnings; no lint fixes were needed. Note: `yarn install` **fails
  on Node 20.17** (`eslint-visitor-keys` requires `^20.19 || ^22.13 || >=24`) —
  use Node ≥ 20.19; this repo was verified on 24.16.

## 2026-06-07

- **Fixed `<Inview>` standalone reveal + spring resize gating** — `<Inview>`
  never animated unless an external `trigger` ref was passed. The JSX `ref`
  callback wrote `inViewRef.current = node`, but that tuple slot is a *callback
  ref* (`setNode`), so the element was never observed and the `node` stayed
  `null`. Now calls `setInViewNode(node)`. This was also a build-breaking type
  error. Additionally, `<Inview>`, `<Spring>`, and `<Hover>` tracked `width` as a
  hook dependency but never passed it to `isMobileDisabled` — fixed by passing the
  tracked `width`, restoring resize re-evaluation and clearing the
  `react-hooks/exhaustive-deps` warnings. `yarn build` and `yarn lint` are now
  clean. See [[decisions-log]] ADR-0013 and [[components/animation-springs]].

## 2026-06-05

- **Home view emptied** — removed the animation showcase (`src/views/home-showcase.tsx`
  deleted) and reduced `HomeView` to an empty `<main>`. The home view is now the
  blank starting point for new work. Documented the convention — *if the project
  is empty and no other instructions are provided, start developing in the home
  view on route `/`* — in [[ai-agent-guide]] and [[new-page]].

## 2026-05-23

- **README — setup + Vercel deploy steps added** — *Getting started* expanded
  into a four-step flow (clone the template → delete bundled `.git` →
  initialise your own GitHub repo → install & run), with a macOS hint for
  revealing the hidden `.git` folder (`⇧ + ⌘ + .`). Added a *🚀 Deploy to
  Vercel* section covering the CLI flow (`vercel` / `vercel --prod`) and the
  dashboard import path, plus an `env pull` pointer to
  [[environment-variables]].
- **README rewritten to lead with the AI workflow** — root `README.md`
  reorganised so the AI usage guide is the first section: how the three
  `.claude/settings.json` hooks (`SessionStart`, `UserPromptSubmit`, `Stop`)
  enforce the vault workflow automatically, how to write a good request
  against this convention layer, and a cost-expectations note recommending
  **Claude Max (5×)** as the minimum plan (the vault-fan-out + hook
  re-injection on every turn is token-intensive by design). Technical
  *Getting started* and the existing AI-agents entry-point pointer stay
  below.

## 2026-05-22

- **Styling-placement convention added** — to stop `globals.css` accumulating
  hundreds of component-specific classes, styling now follows a strict
  placement order: one-offs are Tailwind utilities, repeated patterns become
  **React components** (not `@layer components` classes), and `@layer
  components` is reserved strictly for pseudo-elements and third-party
  overrides. `globals.css` stays bounded — `@import`, tokens, base resets only.
  No CSS Modules. Codified in [[decisions-log]] ADR-0012; [[design-system]]
  (new *Where a style goes* section) and [[component-conventions]] updated.
- **Semantic-HTML / SEO-markup convention added** — new [[html-semantics]]
  rulebook: landmarks, one `<h1>` + heading outline, native elements over
  `div`s, forms/images/ARIA, JSON-LD over microdata, a `data-*` convention, and
  passing a semantic `tag` to animation components. Codified as AGENTS.md hard
  rule #10; cross-linked from [[component-conventions]] and [[new-page]]. Fixed
  the demo (`home-showcase.tsx`) to a single `<h1>` to follow it.
- **API layer added** — a convention for reaching external services.
  `app/api/<resource>/route.ts` Route Handlers own their logic and read secret
  env vars directly (safe — route files never reach the browser). New: `zod`
  dependency; `src/env.ts` (validated env, public/server split); `src/lib/api/`
  (`handle` wrapper + `ApiError` + `{ data }`/`{ error }` envelope);
  `src/lib/api-client.ts` (typed same-origin fetch); example
  `app/api/contact/route.ts`. Codified as AGENTS.md hard rule #9. See
  [[decisions-log]] ADR-0011 and [[api-architecture]].

## 2026-05-21

- **Asset convention added** — site content assets (images, videos) now live
  under `public/assets/<section>/`, one folder per section; meta/PWA/SEO assets
  stay at the `public/` root. Documented in [[folder-structure]],
  [[component-conventions]], and the [[new-page]] playbook; `public/assets/`
  created with a `.gitkeep`.
- **SEO & performance hardening** — a broad pass on the starter. **SEO:** new
  `src/lib/site.ts` config (single source of truth, fed by `NEXT_PUBLIC_SITE_URL`);
  `metadataBase` is now always set (relative OG/canonical URLs resolve);
  `themeColor` moved to a `viewport` export; added `app/robots.ts`,
  `app/sitemap.ts`, and an `Organization`+`WebSite` JSON-LD helper; OG image
  dimensions corrected to match the asset; dead `keywords`/`other` tags dropped.
  **Performance:** populated `next.config.ts` (`removeConsole` in prod,
  AVIF/WebP, `next/image` breakpoints aligned to the grid, `poweredByHeader:
  false`); fixed a `requestAnimationFrame` leak in `ScrollLayout` (Lenis loop
  never cancelled on unmount); `HomeView` is now a Server Component with the
  animation demo split into the `HomeShowcase` client leaf; added
  `<ReducedMotion>` (honours `prefers-reduced-motion` via react-spring's global
  `skipAnimation`); removed a per-frame `console.log` from the demo; added
  `app/loading.tsx` / `error.tsx` / `not-found.tsx`. See [[decisions-log]]
  ADR-0010, [[seo-metadata]], and [[environment-variables]].
- **Animation engine — lint pass** — cleared all 13 pre-existing ESLint problems
  in the engine (2 errors + 11 warnings), an authorized engine edit (ADR-0009).
  `isMobileDisabled` now takes an optional `viewportWidth` argument, so the
  `active` memos in `<Spring>` / `<Hover>` / `<Inview>` / the trigger hooks
  depend on it genuinely. Added missing `disableOnMobile` effect deps; fixed a
  `trigger.current`-in-cleanup hazard in `<Hover>`; ref-stabilised `<Handle>`'s
  transition effects. **API change:** `useProgressTrigger` now returns `progress`
  as a `RefObject<number>` (read `.current`) instead of a render-time ref read —
  no consumer was affected (`<ProgressTrigger>` discards the return).
- **Animation engine — performance refactor** — fixed load issues that scaled
  with the number of animated components. Added `src/lib/animation/ticker.ts`, a
  single reference-counted `requestAnimationFrame` loop; `useLoop` (and all loop
  hooks) now subscribe to it instead of each starting its own rAF. `useWindowWidth`
  / `Height` / `Size` now share one debounced `resize` listener via a
  `useSyncExternalStore` store (the `debounceDelay` param was dropped — unused).
  `useDynamicInView` rewritten without the per-render `Proxy`/observer churn.
  Fixed a stale-closure bug in `useLoop`. `mode="forward"` scroll listeners made
  `passive`. This was an **authorized edit to `#do-not-modify` engine files** —
  hard rule #2 amended. See [[decisions-log]] ADR-0009 and [[animation-system]].
- **`spring-text-engine` updated** — bumped `^0.1.3` → `^0.1.5` (latest). The
  public API, types, and dependencies are unchanged between these versions
  (verified) — an internal-only patch bump, no code changes required.
- **Adaptive scaling grid added** — a root-font-size scaling system landed in
  `src/components/common/grid/` (`<AdaptiveGrid>` + `useAdaptiveGrid` hook +
  `grid.config.ts`), with `vw` media queries in `globals.css` for scale-down.
  It was dropped into `common/` as a `styled-components` system; ported to the
  project stack — config-driven TS + CSS-only Tailwind, no `styled-components`.
  The unused dropped files (`colors.ts`, `fonts.ts`, `utils.ts`, `index.ts`,
  the `styled-components` `grid.tsx`) were removed. Mounted via `<AdaptiveGrid>`
  in the root layout. See [[components/common]] and [[decisions-log]] ADR-0008.
- **Vault created** — `obsidian/` Obsidian vault initialised as the project's
  second brain. Architecture, frontend, and workflow docs populated. See [[decisions-log]] ADR-0001.
- **Root README rewritten** — replaced `create-next-app` boilerplate with a real
  project README that points into this vault.
- **`generic-layout-prompt.md` moved** — relocated from repo root to
  `obsidian/workflows/` as [[generic-layout-prompt]].
- **Navigation convention resolved** — standard `next/link` confirmed; the unbuilt
  `<AnimLink>` / `useAnimRouter()` convention dropped. See [[decisions-log]] ADR-0005.
- **Docs consolidated into the vault** — `project-specs.md` deleted (decomposed into
  vault notes + new [[environment-variables]]); `text-engine-docs.md` moved in as
  [[text-engine-reference]]. `AGENTS.md` rewritten as a thin shim; `.cursorrules`
  repointed to `@AGENTS.md`. The vault is now the single source of truth.
  See [[decisions-log]] ADR-0006.
- **Vault renamed & restructured** — vault folder `getlayers.io/` → `obsidian/`;
  number prefixes dropped from section folders (`00-meta` → `meta`, etc.). Project
  name standardised to **`next16-claude-starter`** across docs and `package.json`.
- **Components linked to docs** — every file in `src/components/` now carries a
  `// 📖 Docs:` pointer comment to its catalog note, so agents can jump from code
  to docs and back.
- **Vault workflow automated** — added `.claude/settings.json` with `SessionStart`,
  `UserPromptSubmit`, and `Stop` hooks that make agents read the vault first,
  follow the relevant guide, and update docs after every change — with no manual
  reminder. See [[decisions-log]] ADR-0007 and [[ai-agent-guide]].
- **Cookie component replaced** — the `react-cookie-consent`-based `cookie.tsx`
  was replaced by an in-house `Cookie/` component (banner + category preferences
  modal + Zustand store). `react-cookie-consent` removed from dependencies. The
  component shipped using `styled-components` + an external design system; it was
  ported to the project stack — Tailwind v4 tokens and `@react-spring/web` motion.
  Mounted via `<LazyCookie>`. See [[components/common]].
- **Fixed TextEngine spring type mismatch** — the `mode="once"` heading in
  `views/home.tsx` mixed `lineIn={{ y: 0 }}` (number) with `lineOut={{ y: "100%" }}`
  (string), throwing *"Cannot animate between _AnimatedString and _AnimatedValue"*.
  Changed to `y: "0%"`. The buggy pattern in [[text-engine]] / [[text-engine-reference]]
  examples was corrected and a type-matching gotcha note added.

## Project baseline (git history)

| Commit | Description |
|--------|-------------|
| `94b0870` | feat: update starter |
| `5280ef2` | fix: linter errors & build |
| `b2b84e6` | initial — `next16-claude-starter` scaffold |

> [!note]
> The starter shipped with: Next.js 16.2, React 19.2, Tailwind v4, `@react-spring/web`,
> `spring-text-engine`, Lenis, and Zustand. See [[tech-stack]] for the current state.
