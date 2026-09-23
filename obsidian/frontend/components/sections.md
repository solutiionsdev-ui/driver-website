---
tags: [frontend, components, stable]
updated: 2026-09-23
---

# Page sections

Catalog of the blocks that make up the home page. Each lives in
`src/views/home/sections/<name>/`, takes its copy as props from
`data/mocks/home.ts`, and is composed by `views/home/index.tsx` — never by a
route. See [[component-conventions]] and [[routing]].

| Section | Folder | Surface | Motion |
|---------|--------|---------|--------|
| Hero | `sections/hero/` + `sections/hero-scene/` | light (`--background`) | three.js scene, `Spring`, [[text-engine]] |
| Season | `sections/season/` | dark (`--surface-black`) | canvas lap trace + chequered seam, ambient grid drift + hub ping, all on springs, [[text-engine]] |
| Timeline | `sections/timeline/` | dark (`--surface-black`) | scroll-scrubbed parallax per plate, hover inset + sibling dimming, [[text-engine]] |
| Paddock | `sections/paddock/` | light (`--background`), dark band at the foot | chequered seam, staged reveals, [[text-engine]] |
| Footer | `sections/footer/` | accent edge, near-black panel | chequered seam, the paddock's contours, staged reveals, [[text-engine]] |

---

## Hero

The masthead, the driver identity, the framed panels and the footer actions,
laid over a full-bleed WebGL portrait. Documented in place — see
[[decisions-log]] ADR-0024 for how it adapts below `xl`,
[[optimize-3d-scene]] for the scene's device tiering, and ADR-0027 for the
helmet the scene wears — a supplied GLB that brings its own baked material, so
there is no external livery atlas and no separate visor mesh any more.

---

## Season — "the season so far"

The page's second block and its first dark surface. A world map fills the
screen; the circuit traced across it fills cyan from the chequered flag over
one lap when the block arrives, behind a bright head. Under the cursor the
map's own dots square up into a chequered flag.

### Files

| File | Role |
|------|------|
| `index.tsx` | Server Component. Composes the four parts below. |
| `season-circuit.tsx` | Client. The backdrop, the canvas, the lap animation. |
| `season-dissolve.tsx` | Client. The chequered-flag seam with the hero. |
| `season-map.tsx` | Client. The artwork as vector, the lap's mask, the ambient loops. |
| `season-dots.tsx` | Client. The halftone, and the cursor that turns it to a chequer. |
| `map-dots.ts` | The halftone as lattice indices, 8,004 of them. |
| `halftone-store.ts` | The tuning params, read by the panel and the field. |
| `map-vector.ts` | The measured geometry: ribbon, mask line, grid, markers. |
| `season-heading.tsx` | Client. Headline, rule, intro copy. |
| `season-plate.tsx` | Client. The standings plate and its frame. |
| `season-globe.tsx` | Client. The badge's globe, turning. |
| `circuit-path.ts` | Data. 907 points, four markers, in a 1440×800 space. |
| `geometry.ts` | The block's design pixels, in rem × `--season-base`. |

Assets: **none**. `public/assets/season/` is gone — the map, the flag and the badge's globe are all drawn. The halftone shipped briefly as
`world-dots.svg`; it is now 18KB of lattice indices in `map-dots.ts`, parsed out
of that asset before it was deleted, so the geometry carried over exactly —
identical sets, worst coordinate mismatch 0.000000 units, and the canvas and SVG
layers agree to 0.007px from corner to corner. In the design the flag interrupts the
track rather than sitting beside it, so a trail drawn straight over the
backdrop buries the one landmark the lap is timed from. The flag was separated
by thresholding a box around it, taking 4-connected components and dropping
every one that runs off the edge of the box — those are the track passing
through; what stays is the flag. It is drawn back on top of the trail every
frame.

### The halftone is lit, and the light lays a chequered flag

The dots are the landmass. Under a light a dot crosses a threshold and **squares
up**: the square grows with the light and the lattice's own parity decides
whether it fills or clears, so at full strength the squares meet edge to edge
and the patch is a chequered flag — the thing a race ends on, and the mark the
block already draws at the finish. It settles back to a dot behind the light.

This was an ASCII ramp first, shared with the lap's hot edge through an
`ascii.ts`. The ramp's bright end is `+ * #`, and a cross is the one mark this
block cannot spend: the map already carries grid axes, a hub, corner ticks, and
the reticle's own arms are crosses. Both users are gone and so is the module.

The seed square is **0.7 of the lattice pitch**, not the dot's own 0.45. Tied to
the dot, the far half of each reticle arm drew squares barely bigger than what
they replaced and the arm read as a faint dotted line. The square has to arrive
as a square; the light level rides in its colour.

Two ambient lights sit in SCENE CONTROLS → **Halftone** and **neither ships**.
`edge` is the lap's own head — `season-circuit.tsx` publishes it into a ref each
frame, in map units, so the conversion happens once rather than per dot — and it
lit the field as the trace drew, so the block loaded through a travelling patch
of chequers instead of laying its line down cleanly. `wave` is a band crossing
the map on its own clock. The shipped source is `none`.

The **cursor** is the light that ships — and
it is a **reticle**, not a torch. A round light following the pointer was built
first and thrown out: it is the effect every site has. The map already carries
grid axes, a hub and corner ticks, so the cursor reads far better as
instrumentation. Two arms run along the cursor's own lattice row and column,
with a bloom where they cross. The arms are one dot thick and the field is
sparse, so the crosshair is broken by the geography it passes over — it draws
the coastline as two lines of type instead of washing a disc of the map.

The arms **only open when the cursor settles**. Above 900 map units a second
they are fully retracted and the reticle is just its crossing; a cursor
travelling is a point being tracked, a cursor that stops is a reading being
taken. Opening takes 0.38s and shutting 0.09s, so it acquires rather than
flickers, and it resets to shut when the light goes out. Speed is measured off
the *light's* own travel, not the raw cursor, so a mouse that jumps between two
frames does not read as a longer motion than the light made.

Mechanically it is the same flat index the edge light uses: `addPoint` for the
crossing, one row walk and one column walk for the arms. `add` keeps the
brighter claim on a dot, so two lights crossing never sum into a blown-out
patch. The arms fall off **linearly** where the round lights fall off
quadratically — a square law puts the far half of each arm under the glyph
threshold, and a crosshair that fades after a third of its length reads as a
smudge rather than a line. Conversion is the dots canvas's own rect — it is
`inset-0` over the box the map's viewBox describes, so the cover-fit above it
never enters into it — and the section's box decides whether the light is lit
at all.

It **arms only once the lap has finished**, on the cool-down spring's `onRest`,
so the reader meets the block's own animation before their pointer competes
with it. Off entirely without `(hover: hover)` or under
`prefers-reduced-motion`.

**Seven dots are missing on purpose.** A five-dot chain at lattice cols 96-99 /
rows 0-4 and singletons at (92, 11) and (85, 29) read as dirt rather than as
land and were cut from the packed data. 89 more dots sit in components of eight
or fewer; **23 of those are trace artifacts on the grid** — lattice columns 82,
163 and 244 are exactly `GRID_AXES_X` and row 89 is `GRID_AXIS_Y`, so the
halftone parse picked up dashes off a grid the map already draws itself. They
are still in the field, and are the obvious next thing to clear.

**Holding a frame rate with 8,004 dots.** The resting field is baked once into an
offscreen canvas and blitted; only lit dots are touched per frame. They are found
by arithmetic, not search — the dots sit on a lattice, so the edge light asks for
a range of rows and columns out of a flat index, and the wave binary-searches a
projection precomputed along its heading. A faded dot leaves the active list, so
an idle field costs one blit. Measured in the browser at the size it runs at:
0.12ms a frame for the edge, 1.14ms for the wave, 2.82ms at a deliberately absurd
2,000 glyphs, against 16.7ms for 60fps.

Two details worth keeping. The glyph pass runs in two sweeps — every lit dot is
lifted out first, then the glyphs go down — because a glyph is wider than the
lattice pitch and one pass would let a later dot's clear bite a hole in an
earlier glyph. And `bake()` paints the visible layer itself: resizing a canvas
clears it, and waiting for the clock's first tick left the field blank.

### The map is vector

The backdrop was a raster. It is now drawn: the circuit from the designer's own
Figma path — a **filled ribbon** of varying width — with the grid, rings, corner
marks, turn markers and chequered flag redrawn parametrically from measurements
off the frame. The one exception is the halftone, `world-dots.svg`: 8,011 dots
in a single path, 5KB over the wire, and nothing about it moves. Inlining it
would push 400KB of path data through the parser for nothing.

The supplied layer carries no placement — Figma exports it at its own origin —
so its position came from the raster, by fitting its bounding box to the
track's. The two axes agreed to **1.0000**, and the layer diffs at 0.59/255
against the raster it replaced. Seating it needs one more correction: the map's
2560x1440 frame is squarer than the 1.807:1 artwork, so the art is banded top
and bottom, and `MAP_RENDER` in `season-circuit.tsx` undoes that band.

### The ribbon stops for the flag

The supplied path runs straight through the finish; the frame does not. In the
frame the white line ends bluntly on the approach, the chequers fill the gap,
and the line picks up on the far side — so the ribbon is cut there by a mask,
36 x 28 units, rotated to the track's own heading at the seam (144 deg, taken
off the dense centreline) rather than to the frame. Without the cut the lap's
fill rides over the finish instead of arriving at it.

The cut is applied **twice** — once as a mask on the SVG ribbon, once as a
`clearRect` on the canvas, after the trail is down. Cutting only
the ribbon leaves the finish washed over anyway, because the canvas draws its
glow along the whole lap on top of the SVG, and a glow with no gap is a cyan
haze straight across the chequers. `FLAG_CUT` is in map units and
`mapToArtboard` converts it for the canvas, so the two cuts cannot drift apart.

The flag itself is `FLAG_DIAMONDS`, seven diamonds measured off the frame. A
`<pattern>` filling a rect was tried first and drew a full board; the frame's
flag is a loose run with the map showing between the diamonds, and the solid
patch read as a different object. Their bounding boxes come out exactly half
filled, which is what says diamond rather than square.

### The lap fills the ribbon, it does not trace it

The accent copy of the ribbon is drawn under a **mask**: the lap centreline,
stroked wide, with its `stroke-dashoffset` animated. Sliding the dash uncovers
the ribbon along the lap, so the fill carries the designed shape at every point
instead of a constant-width stroke standing in for it.

Three things make that safe. The mask is 30 units wide — enough for the
ribbon's 19.4 at its widest *plus* the 3.3 the simplified mask line strays from
the walk, and still well under the 53-unit closest approach between distant
strands, so it can never bleed onto a stretch the car has not reached. The dash
runs on `LAP_LENGTH`, an exact polyline sum, **not** `pathLength` — the first
attempt used `pathLength` and silently filled the whole ribbon at every offset,
because not every renderer honours it for dash maths. And the offset rides the
same `distanceAtTime` curve as the canvas head, so the fill and the hot edge
cannot drift apart through the corners.

With the ribbon owning the body of the lap, the canvas keeps only the hot edge:
glow, heat gradient, white filament, tip spark and the marker flares.

### The head used to break into ASCII, and does not

The head ran through a second, offscreen canvas drawn at **one pixel per glyph
cell**, so a whole-frame luminance reading cost a single `getImageData`; any
cell over 0.62 — above the accent's own 0.587 and below the head's — was eaten
out of the smooth line and re-set as a glyph. It is removed: the lap is a line
being laid down, and a line that comes apart into type while it draws is a
second event competing with the first. The trace now loads clean, which is what
was asked for. `heat` survives it — it still drives the head's gradient, its
filament and the tip spark, and cooling to 0 still returns the tip to the
body's accent.

### Motion

The lap is a `@react-spring/web` spring over 4.2s, and the canvas is drawn from
that spring's own `onChange`. The spring runs 0-1 in *lap time*, not in
distance: `TIME_AT` re-times the path off its own curvature so the car brakes
for the corners, and a binary search turns a time back into a distance. A
second spring runs on `onRest` and cools the head. An in-view render loop
([[hooks]] `useLoopInView`) was tried first and stalled the lap partway: the
shared ticker puts a subscriber to sleep ten frames after its element leaves
the viewport, and this block is out of view for the whole of the page's first
paint. Driving from the spring ties the work to exactly the window it is needed
in — and it inherits `ReducedMotion`, so "reduce motion" jumps straight to the
finished lap instead of animating it.

The trigger is a separate `IntersectionObserver` at a 0.35 threshold that
disconnects after firing: one pass, on arrival, never again.

**`SeasonCircuit` must never re-render.** `useSpring` is handed a declared
`lap: 0`, and on a re-render react-spring reconciles the spring back toward
that declaration — the fill runs smoothly back to empty over another `LAP_MS`.
Nothing here re-rendered for a long time, so it stayed invisible; the cursor
light's armed flag, wired through `useState`, produced the component's first
re-render and it landed exactly on the lap's finish. The flag is a **ref**
now, read inside the halftone's own frame loop. An empty deps array on
`useSpring` does *not* prevent this — only not re-rendering does. Anything
added here that needs to signal downstream should follow the same pattern.

Verified against a real Chrome over the DevTools Protocol, because the in-app
preview pane backgrounds itself and rAF stops, so the lap can never finish
there. Headless at 51-61fps the fill holds at offset 60 for the whole trace,
0 retreats over 144 samples, unaffected by scrolling up and back down.

Two ambient loops run under the lap, in `season-map.tsx`. The dashed grid
crawls one dash period every 7s, and the hub sends a ping out through the
rings every 4.2s, easing out to 86 units and fading on `(1-v)^2` from 0.4.
Both are deliberately slight: the frame is an instrument panel and an
instrument panel is never quite still, but neither loop may pull the eye off
the lap. Unlike the lap's one-shot observer, these have a second
`IntersectionObserver` that *stays* connected and pauses both springs when the
block leaves the viewport, so an idle block off screen costs nothing.

### The plate is a drawn frame, not a bordered box

The plate's bottom-right corner is cut, and the first pass faked that by
clipping a bordered box. A `clip-path` cuts the corner but leaves the diagonal
**unstroked**, so the outline hung open there with two loose ends. The frame is
one `<path>` now — `M0.5 0.5H276.5V69L268 77.5H0.5Z`, the stroke centreline
half a unit in so a 1px stroke sits exactly inside the 277x78 box — and the
divider is a `<line>` at 83 in the same SVG, so the whole frame has one colour
source. The viewBox is the design's own px, and the box is set in rem off the
same numbers, so it maps 1:1.

The path is **filled** with `--surface-black` rather than left transparent. The
plate is an instrument reading laid over the map, not a window onto it, and the
backdrop's furniture drifts under it as the section re-crops. Nothing of the
map is lost: sampled at the design size, all three canvases and the SVG are
empty behind the plate.

Dropping the CSS border moved the stats 1px left, 1231 to 1230. That pixel was
the border eating into the grid's content box; the divider now sits at a true
83 from the plate's edge with the text 16 after it, which is the design's own
arithmetic.

The badge's **globe turns**. Limb and equator are the spin axis seen side on
and never move; only the meridian sweeps, its `rx` running as `cos` of the
turn. That is the real projection rather than a squash, so the meridian passes
through the limb at a half turn and goes edge-on at the quarters the way a
meridian actually does. SVG declines to render an ellipse with `rx` 0 at all,
so it is floored at half a stroke — which is the edge-on sliver it should read
as anyway. One revolution per 10s, paused off screen.

### The type assembles

The headline was already word by word; the rest of the copy now matches. The
plate's badge and all three stat rows resolve **letter by letter** — the figure
first, its wording 70ms behind it, each row 110ms later than the last — and the
intro copy is a word reveal rather than a block fade. Each run is its own
`TextEngine` rather than one over the whole row, because the figure and its
wording are different colours and the engine owns its own markup.

One trap, and it will bite again: the engine lays its words out as **flex
items** and spaces them with its own `columnGap`, not with the face's space
glyph. The default 0.3em is wider than the space Space Grotesk sets, which took
the 232px intro onto a fourth line and pushed the plate 20px down the frame. It
returns to the designed three lines at 0.24em and below; 0.22 is set, for a
step of headroom against font-metric drift. Any engine run inside a
fixed-width box needs its wrap measured, not assumed.

No engine here sets `overflow`: the plate is on `leading-cap` (0.72) and the
headline on 0.93, and a clip at either shaves the letters.

### Type — measured from the Figma layers, not the raster

| Element | Figma | Token |
|---------|-------|-------|
| `THE SEASON SO FAR.` | Oswald Bold 55 / 0.95, accent, full stop white | `text-display-sm leading-headline` |
| rule | 24×2, accent, 28 below the headline, 30 above the copy | — |
| intro | Space Grotesk 18 / 1.1, white, uppercase, 232 wide | `text-lead leading-display` |
| plate badge | Space Grotesk 12 / trim, −0.24px; `F1` white, `/ 2026` accent | `text-eyebrow leading-cap tracking-eyebrow` |
| plate stats | Space Grotesk 14 / trim, gap 8; figure accent, wording white | `text-body leading-cap` |

The first pass read these off the backdrop raster and got four of the five
wrong. Take type from the text layers.

`leading-cap` (0.72) is what stands in for Figma's `text-box-trim: trim-both`
with a cap-alphabetic edge: it takes a 14px line to a 10px box and a 12px line
to 8.6, which is what the plate's rows measure in the frame. Applied to the
single-line rows only — on the three-line intro it would break the internal
line rhythm, and nothing sits below the intro for the outer box to push.

Only one size was new: `--text-display-sm` (55). Everything else was already
in the scale. The canvas reads `--accent` and `--foreground-on-dark` off the
root at mount rather than hard-coding the trace's colours. See
[[design-system]].

### The backdrop dissolves at its own edges

The map is masked top and bottom with a `linear-gradient`, and it is not
decoration. The three dashed grid axes and the dot field reach the section
boundary, and without the fade they stop dead on it — under the hero at the
top, and against the timeline at the bottom, whose rail sits at the *same x* as
the map's centre axis and starts just as abruptly. One line ending hard and
another starting hard is what makes two blocks read as two slabs.

The fade is a **share**, not a length, because the stage is cover-fitted and so
scales with the section. 10% is the ceiling: the lap sits 13.4% down from the
top at its closest approach, so the trace never enters the fade. The headline,
the copy and the standings plate are outside the masked element altogether.

### What the block anchors, and what it does not

The artwork's corner ticks are **seven, not eight**. The bottom-right one, at
map [2471.93, 1343.3], is left out: the backdrop is cover-fitted, which pins
that column of marks to the section's right edge at every window size, and at
the plate's own height it lands as a stray white chip against the plate's
border — 3.4px past it on a 1550-wide window. It sits off screen at the
design's 1440, so nothing there changes. The proper fix, if the marks ever
need to read as they do in Figma at every width, is to anchor them to the
section box rather than to the map — but that moves them at 1440 too.

The headline sits at a fixed 32/70 from the section's top-left, so it lands
exactly where the frame puts it. The plate is anchored to the section's
*bottom* at 32, which reproduces the frame's `y=690` at the design's 800 and
keeps the plate on the corner at any other height — the section is
`min-h-lvh`, not an 800px artboard.

---

## Timeline — "from karts to F1"

The page's third block, ported from Figma node `2003:101` — a 1440x3461 frame
with a dashed rail down the middle, ten cyan years and ten chamfered plates.
The plates are **empty on purpose**: images and copy drop into
`TimelinePlate`'s children and the parallax picks them up.

### Files

| File | Role |
|------|------|
| `index.tsx` | Server Component. The rail, the rows, the labels. |
| `timeline-plate.tsx` | Client. One frame: outline, slot, parallax, hover. |
| `timeline-rail.tsx` | Client. The track, the progress line, the marker. |
| `timeline-heading.tsx` | Client. "FROM KARTS TO F1." |
| `geometry.ts` | The block's measurements, and the unit that carries them. |
| `plate-shape.ts` | The plate's curve, twice — as drawn and as a unit box. |

### The frame is a stack, not a scatter

Ten plates at what look like arbitrary coordinates are in fact a plain vertical
stack: a 217-tall gutter row, then a 462-tall centre row, five times over. 5 x
217 + 5 x 462 = 3395, plus 34 above and 32 below, is the frame's 3461 exactly —
which is how you can tell, and why the port needed no absolute positioning per
plate. Years sit at each row's own middle; copy sits at each centre row's.

### The block measures itself, not the root font

The section is a `@container` and **every length and type size is a share of its
own width** — one design pixel is `100/1440 cqw`. That is not a preference. The
project scales the root font in bands (`grid.config.ts`), each expecting a
design authored at that band's base, and the only frame for this block is 1440.
Rem therefore failed three different ways:

- **Above 1440** the stack came apart. It closes only because the side plate's
  right edge meets the centre plate's left one — 32 + 333 = 365 =
  (1440 - 710) / 2 — and centre plates are centred while everything else is
  anchored to an edge. At 1920 the side plate ended at 365, the centre plate
  began at 605, and the copy landed at 1020, *inside* the plate.
- **Below 1280** the root holds at 16px, so a 1440 frame ran off the screen.
- **Between 1441 and 1920** the band bases on 1920 and the root shrinks — 12.6px
  at 1512. Capping the frame at `90rem` put the block at 1134 wide in a 1512
  window; moving the layout to `cqw` but leaving type on rem left the type a
  quarter behind its boxes, 28.4 where the design wants 37.8.

Checked at 1152 / 1280 / 1366 / 1440 / 1512 / 1600 / 1728 / 1920: fills, stack
closed, no overflow, and design-exact at 1440.

The trade is real and worth knowing: the block no longer follows the page's band
scale, so at 1512 it runs at 1.05 of the design while the rest of the page is at
0.79. A 1920 frame from the designer, or `grid.config.ts` learning this block's
base, is what retires it.

Everything is written in **the design's pixel over 16**. The project's root font
size is already `1.111111vw` up to 1440, so a rem *is* a design pixel: the block
reproduces the frame at 1440 and scales with the viewport for nothing. Measured
in Chrome, all ten plates land at 0,0,0,0 against Figma and the section is 3461
to the pixel.

The copy renders 99 tall where Figma says 93. That is the half-leading Figma
trims with `text-box-trim` and CSS does not; the box is centred, so the *visual*
cap-top still lands on the design's box top.

### The plate is one curve, used two ways

The design exports the plate twice, once per size. The two are the same curve at
2.13x — aspect differs by 0.2% — so it lives here as one path. It has to be a
path rather than the exported `<img>` anyway: these are content frames, and an
image of a rectangle cannot hold anything.

`PLATE_OUTLINE` is stroked at the export's own coordinates with a non-scaling
stroke. `PLATE_CLIP` is the same curve normalised to a unit box, for a
`clipPathUnits="objectBoundingBox"` clip that scales with whatever carries it —
one clip for both sizes.

### Motion, measured off the reference

Read off eladiodieste.com by driving it in Chrome rather than guessing:

- **Parallax, inside the frame.** The slot's content rides from **-30% of its
  own height to 0** as the plate comes up the screen, linear, clamped at both
  ends. The reference runs -140.5px on a 468px frame, which is exactly 30%,
  over a window that is `top bottom` to `top center`. It is a scrub: scrolling
  back rewinds it. Shipped at **10%**, not 30 — see the note in
  `timeline-plate.tsx`: travel needs the content taller than the frame, and a
  30% overscan had `object-cover` cutting the sides off every supplied
  photograph.
- **Parallax, of the frame.** Added 2026-09-07. Each row is three layers
  travelling at hard-different rates as the row crosses the viewport, so it
  reads as floating rather than as one flat card. Half-ranges either side of
  the design position: **copy 110** design px (it is nearest the reader,
  sitting over the photograph on `z-20`), **side plate 60**, **centre plate
  20** (the ground the row is built on). The **year** takes its own plate's
  figure rather than a fourth: it is that photograph's marker, and a layer of
  its own would slide it off the picture it belongs to. Figures live in
  `PARALLAX` in `geometry.ts`; the layer itself is `ParallaxLayer` in
  `timeline-row.tsx`, a thin wrapper over `<SpringTrigger mode="scrub">`.

  **The effect is the difference, not any one figure** — the copy slides 180
  design px against the photograph it sits on across a crossing.

  Two constraints shape it, both practical:

  - **The travel is centred on the design position, not hung off it.** Each
    layer runs `+value` to `-value`, so it is exactly where the 1440 frame
    puts it as the row passes the middle of the screen, which is where a
    reader judges the composition — and the excursion buys twice the
    differential per pixel moved. It costs one thing: `useSpring` initialises
    on `from`, so a row already on screen at first paint is half a travel out
    of place for the frame it takes the ticker to read the scroll. Every row
    but the first is below the fold, and the block is the page's third.
  - **The ceiling is the stack, which butts with no gap** — this is the one
    figure in the block that can put two rows on top of each other. Measured
    headroom: a centre plate reaches the side row's year at ~109, a side plate
    reaches the centre row's copy at ~181 (the copy starts at 1020 and a
    right-aligned side plate at 1075, so those two do overlap), and the copy
    only ever moves inside its own 462-tall row, 231 from either edge. Every
    figure is inside half its own limit. Small screens need no separate cap:
    the travel is in `cqw` off the block's width, so the copy's 110 is 110
    real pixels at 1440 and 30 on a 390-wide phone.

  It composes with the slot parallax above on purpose: the frame moves against
  the block, the picture moves against the frame, and the second is what keeps
  the first from reading as a sticker being slid around.
- **Hover.** Hovering one plate dims every **row** but the one under the
  pointer — the row, not the plate: the year straddles the rail and the copy
  overhangs the plate by 55, so dimming the plate alone left text lying on a
  receding plate at full strength. The slot insets 5% while the outline stays
  put, over 700ms on
  `cubic-bezier(0.33, 0, 0, 1)` — the reference's own curve, read off its
  computed style — and every other plate drops to `opacity: 0.3`. Both are CSS
  transitions: hover is trivial state, and springs are for the scroll.

### The rail carries a thread, and it crosses the seam

Three layers, not one — the first pass shipped only the track and the block sat
still. Over the dashed track runs a **progress line** in white, and at its tip a
**marker** that turns. The line's tip tracks the **middle of the viewport**: its
length is the distance from the rail's top to the fold, a scrub from
`top center` to `bottom center`, so the marker is always at eye level and the
white behind it is how far you have read. The turn is **linear in scroll
position** — 48.65 degrees per 100 scrolled pixels on the reference, constant to
two decimals and frozen the moment scrolling stops — which comes to five turns
over this rail, kept as turns so it still completes at any width.

This is also what the design's white squares are. Figma draws one at two of the
ten years; it is a single marker drawn twice, not an unfinished macro.

**The thread stops on the last entry**, 45 above the middle of the final row —
the offset both of Figma's drawn squares sit at, and 40.3% down the last plate.
`restingPoint()` derives it from the row rhythm and hands the rail a fraction
rather than 1; running to the end put the marker on the plate's bottom edge,
which is not what the frame shows.

The measurements live in a plain `geometry.ts`, and that is structural: they are
read by the Server Component that lays the rows out *and* by the client
component that draws the rail, and **a value cannot cross a `"use client"`
boundary**. Imported that way, the rail's lead arrived as a client reference
rather than a number, every sum built on it came out `NaN`, the spring wrote
`height: NaN%`, and the line never moved — with nothing in the console.

The run ends on **`bottom bottom`, not `bottom center`**, and that is a
concession. `bottom center` is what keeps the tip at the fold the whole way, and
it is what the reference uses — but it can only finish if there is page below,
and this rail ends with the document. A page stops scrolling once its bottom
reaches the bottom of the window, so the last half-viewport is unreachable and
the marker stranded `vh/2` short of its own end. `bottom bottom` completes the
run as the page runs out, at the cost of the tip drifting from the fold to the
bottom of the window across the block. **Put `bottom center` back the moment a
block lands underneath this one.**

The rail stops on the **gutter**, 32 above the section's edge — Figma's line
runs y 102 to 3429 in a 3461 frame, finishing level with the last plate. Its
fade is top-only: the bottom is the end of the document rather than a seam, and
fading there swallowed the marker exactly as it arrived.

The rail reaches **260 above its own section**, into the tail of the season
block. That is what carries the seam: the thread is on screen and moving before
the timeline's content begins, and with the map fading out over the same
stretch the two blocks are stitched by one line rather than butted together.
The section drops `overflow-hidden` for it.

One trap here, and it is silent: the **masked box is 16 wide, not 1**. With the
fade mask on a `w-px` rail the 9px marker — 12.7 across once it turns — sits
outside the mask's own painting area and never renders at all.

Two more traps, same kind:

- **`interpolate` cannot rebuild transform functions.** `src/utils/math.ts`
  turns `translateY(-30%)` into `translateY(-15(%)` — a stray bracket. Invalid
  CSS, so react-spring holds the last value it parsed and the animation looks
  frozen at its start. react-spring's own `y` shorthand is no better: a
  percentage string resolves to `transform: none`. The plain-unit branch is
  correct, so the parallax travels on `top`.
- **Labels eat the hover.** The years sit at `z-20` dead centre of the plate.
  Without `pointer-events-none` the year swallows the plate's hover and nothing
  happens. The reference marks its own labels the same way.

Placement lives on a wrapper, never on `TimelinePlate` itself: Tailwind resolves
`relative` and `absolute` by emission order, not by the order they appear in a
class attribute, so a plate handed its position through `className` lost to its
own `relative`.

---

## Paddock — "from the paddock"

The page's fourth block and its return to light, from Figma node `1892:994`.
Measured in `cqw` off its own width, like the timeline, so it is the 1440 frame
at every viewport.

| File | Role |
|------|------|
| `index.tsx` | Server Component. The stack, and the seam. |
| `geometry.ts` | The measurements, and the unit that carries them. |
| `paddock-intro.tsx` | Client. Masthead, report, call to action. |
| `paddock-panels.tsx` | Client. The meeting, and the numbers. |
| `paddock-calendar.tsx` | Client. The season's run along the foot. |
| `paddock-backdrop.tsx` | Client. The hero's contours, marched in 2D. |
| `paddock-bracket.tsx` | The corner bracket, one path four ways. |

**It runs the full height of the screen**, and every part is anchored to the
edge it belongs to: masthead and panels to the top, the dark band and its
calendar to the foot, the intro column 32 above the band — the gap the design
actually fixes, where its 436 from the top only holds at its own 800. The
portrait is sized off the block's **height** (816.29 in an 800 frame, so 102%),
which is how it keeps bleeding past both ends at any height.

**The portrait drifts, and only upward** (added 2026-09-08, `PARALLAX_PORTRAIT`
= 48 design px, `<SpringTrigger mode="scrub">`). The direction is measured, not
chosen: the figure is sized to fill the block, so its foot lands on the bottom
edge exactly and its crown clears the top by about 14 real pixels. Drifting
*down* spends that 14 and then opens a strip of bare backdrop above the head;
drifting up only lifts the foot further into the dark band, which is solid
black and where the figure fades out anyway. That is why this one is hung off
its design position while the timeline's rows are centred on theirs — those
have room either side and this does not.

The layer is `absolute inset-0`, so it measures the whole block as its own
trigger and, covering the section exactly, is a containing block the figure's
percentages resolve against identically — the placement is untouched. It
travels on `top` against a `relative` inner, for the reason set out in
[[components/animation-springs]].

**The backdrop is the hero's field, not the design's SVG** — the same call the
hero made, and its own comment says so. Four sines at incommensurate
frequencies with two crossed displacements, on the same constants from
`DEFAULT_PARAMS`. It marches the field on a grid rather than slicing it in a
shader, evaluating each vertex once a frame so every contour level reuses it; a
whole WebGL context for one background is not a trade worth making.

**The order of the stack is the block.** Surface, the design's faint curves,
the dark band, *then* the portrait, *then* a gradient over it. The band sits
under the figure and the gradient over it, which is how the figure melts into
the strip rather than being cut by it.

**The brackets are one shape.** `BRACKET_PATH` runs along the top and down the
right, so it is the top-right corner; the other three are it turned 90, 180 and
270. Figma exports all four as separate files.

**Anything `absolute inset-0` here needs `pointer-events-none`.** The bracket
reveals are full-bleed and invisible; without it the wrapper sits over the whole
section and swallows every hover in the block, the call to action included.

**Read the render, not the metadata, for anything with a transform.** The
calendar's connectors carry a 180-degree rotation, so Figma reports each one's x
at its *end*; taken as starts they land a whole position right. Their true x —
416, 580, 743, 914 — came off the rendered frame's own pixels, and so did the
fact that they are dashed 7-on 4.5-off rather than solid. The call to action
went the same way: the node renders a `#090a0b` interior with only its 1px ring
in accent, which is a filled slab, not the outline the exported `Subtract`
suggested.

**The calendar is not on a grid.** Each card carries its own x and width from
the design, and several names are wider than the card they are given — the
design lets them overrun on one line rather than break. The markers are pinned
to the connector run at a fixed height rather than sitting at the foot of a
card, because the cards are not the same height.

### The seam is the page's flag, run the other way

The hero joins the season block by carrying its light surface into the dark one
and breaking it into a chequered flag. This block is joined the same way, with
the *dark* surface carried into the light one — `SeasonDissolve` takes a `carry`
prop rather than being cloned, since the chequers and their accent are identical
either way and only what they are cut from changes. Promote it out of
`sections/season/` the next time a seam needs it.

---

## Footer — "keep pushing forward"

The page's last block, from Figma node `1890:758`. A cyan page edge with a
near-black panel inset 16, the helmet centred, and the sign-off around it.

| File | Role |
|------|------|
| `index.tsx` | Server Component. The edge, the panel, the figure, the seam. |
| `geometry.ts` | The measurements, and the unit that carries them. |
| `footer-content.tsx` | Client. Logo, masthead, nav, foot. |

**Surface and panel are two elements**, not one with a border: the panel
carries the artwork and clips it, and the accent has to run behind it right
into the corners. **The copy sits on the section, not in the panel** — the
design's coordinates are frame-relative, and nesting them in a panel inset 16
pushes everything 16 in on both axes.

**The figure rides back into place as the page bottoms out** (added
2026-09-08, `PARALLAX_FIGURE` = 60 design px). The footer is the last block, so
it never finishes a crossing — its bottom cannot leave the top of the viewport
— and a travel hung off the usual `top bottom` → `bottom top` window would stop
part-way and leave the figure permanently displaced in the state every reader
ends the page on. The window closes at **`bottom bottom`** instead, the moment
the page is scrolled to its end, and the figure's `to` is its design position,
so where a reader comes to rest is exactly the frame.

The displacement is **downward**, for the same reason the pair is not clipped to
the panel: the suit hangs 8 past the foot to cover the accent edge, and lifting
the figure by more than that shows the cyan strip along the bottom that the
design does not have. Down is free — the section clips it. And the helmet and
the suit travel as **one group**, not as two layers: they are a single figure
resting on its own collar, and separating them by even a few pixels takes the
head off the shoulders — the same failure `FIGURE` already notes for scaling
them apart.

**The suit plate shows only the suit** (2026-09-08, `FIGURE.body.suitFrom` /
`suitTo`). `body.webp` is a full portrait — head, hair, and the driver's own
helmet held beside it — and the two plates are not to one scale: the suit is
sized 0.75 frame px per image px, the helmet 0.65, so the portrait's head is
drawn a seventh larger than the helmet that hides it and its right edge showed
as a second helmet behind the first. A `mask-image` fade from 0.69 to 0.72 of
the plate's height takes everything above the collar off; the fade lands under
the helmet's chin, which covers the collar down to 0.72 at its narrowest, so
the join is never seen. A mask rather than a rescale, because the suit's size
and place are the design's.

**The backdrop is the paddock's**, literally: Figma ships the same boolean
union of nine curves in both blocks, same vector names and coordinates, so
`PaddockBackdrop` is reused and only its colour token changes — white-on-black
here, ink-on-light there.

**`w-max` on the nav rows.** "Next race" is wider than the 158 the column is
given, and the text engine sets its own wrap inline; constrained, the row broke
in two and landed on "store". Third block running that the engine's inline wrap
has decided a layout — see the calendar's race names and the timeline's copy.

## In-page anchors — `anchor-scroll.tsx`

The nav, the menu sheet, the footer and the hero's "view profile" point into
the page rather than at routes of their own (ADR-0031):

| Link | Target | Carried by |
|------|--------|------------|
| Driver, view profile | `/#career` | the timeline's `StackLayer id` |
| Season | `/#season` | the season's `StackLayer id` |
| Next race | `/#paddock` | `Paddock`'s `id` prop |

`<AnchorScroll/>` (client leaf, rendered once in `HomeView`) resolves them. A
native anchor jump cannot: the first layers of `SectionStack` are `position:
sticky`, so their rect is where they are *stuck*, not where they sit in the
flow, and scrolled past the hero `#season` reads 0. Every `StackLayer` carries
`data-stack-layer`; a target inside one is placed at the stack's top plus the
heights of the layers before it. It then scrolls through Lenis (`force: true`,
because the menu sheet stops Lenis and the closing click is the same click).

It listens for clicks in the **capture** phase on `document`, ahead of React's
root listener, so `preventDefault()` makes `next/link` skip its own hash
navigation (it bails on `defaultPrevented`) while the link's own `onClick` —
closing the sheet — still runs. Modified clicks fall through to the browser.
Arriving from another route with a hash (e.g. the coming-soon pages' header)
is handled on mount, after a short delay for the loader and first layout.

## Related

- [[component-conventions]] — props, not hardcoded content
- [[animation-system]] — springs, the shared ticker
- [[text-engine]] — the headline, plate and intro reveals
- [[decisions-log]] — ADR-0025
