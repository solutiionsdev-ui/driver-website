// 📖 Docs: obsidian/frontend/components/sections.md

import Image from "next/image";

import type { HomeContent } from "@/data/mocks/home";
import { SpringTrigger } from "@/components/animation/springs/spring-trigger";
import { PaddockBackdrop } from "@/views/home/sections/paddock/paddock-backdrop";

import { FooterContent } from "./footer-content";
import { EDGE, FIGURE, PARALLAX_FIGURE, px } from "./geometry";

export interface FooterProps {
  content: HomeContent["footer"];
  className?: string;
}

/**
 * "Keep pushing forward" — the page's last block, and its sign-off.
 *
 * Ported from Figma node `1890:758`. The whole thing is a **cyan page edge**
 * with a near-black panel inset 16 inside it, which is why the surface and the
 * panel are two elements rather than one with a border: the panel carries the
 * artwork and clips it, and the accent has to run behind, right to the corners.
 *
 * There is deliberately **no chequered seam** into this block. The flag joins
 * surfaces of different colour; here the accent edge already draws the join,
 * and a dissolve over it read as a second, competing transition.
 *
 * The backdrop inside the panel is the *same* boolean union of nine curves the
 * paddock block ships — identical vector names and coordinates in Figma — so it
 * gets the same treatment: the hero's animated contours rather than the static
 * export. `PaddockBackdrop` is reused directly; it draws its own field and
 * takes its colour from a token, so the only thing that changes is which token.
 *
 * The figure is two plates, the suit behind and the helmet in front, both sized
 * off the block's **height** so they keep filling the panel at any screen.
 */
export const Footer = ({ content, className }: FooterProps) => (
  <section
    // `min-h-lvh` from `lg`. Below it the block is the figure's own height
    // plus the rows above and below it — a full viewport there is mostly the
    // empty band between the masthead and the helmet.
    className={`@container relative isolate min-h-[var(--foot-h,100lvh)] w-full overflow-hidden bg-accent max-lg:[--type-min:13px] max-sm:[--foot-gutter:24px] max-sm:[--foot-h:680px] max-sm:[--nav-mid:282px] max-sm:[--cta-bottom:73px] max-sm:[--foot-bottom-min:var(--foot-gutter)] max-sm:[--social-bottom:151px] max-sm:[--social-left:var(--foot-gutter)] max-sm:[--social-right:auto] max-sm:[--social-min-w:auto] max-sm:[--logo-w:106px] max-sm:[--logo-h:24px] max-sm:[--nav-size:30px] max-sm:[--nav-gap:18px] max-sm:[--nav-row:auto] max-sm:[--nav-w:calc(100cqw_-_2*var(--foot-gutter))] max-sm:[--cta-left:var(--foot-gutter)] max-sm:[--cta-w:calc(100cqw_-_2*var(--foot-gutter))] max-sm:[--foot-head-left:var(--foot-gutter)] max-sm:[--foot-head-right:auto] max-sm:[--foot-head-top:78px] max-sm:[--cta-h:50px] max-sm:[--foot-copy-min:212px] max-lg:[--foot-head-min:6.6667cqw] max-sm:[--foot-head-min:40px] max-sm:[--head-w-min:240px] sm:max-lg:[--foot-h:104cqw] sm:max-lg:[--fig-scale:0.87] sm:max-lg:[--fig-shift:3%] sm:max-lg:[--logo-w:106px] sm:max-lg:[--logo-h:24px] sm:max-lg:[--nav-size:36px] sm:max-lg:[--nav-gap:12px] sm:max-lg:[--nav-row:34px] sm:max-lg:[--cta-left:50%] sm:max-lg:[--cta-shift:-50%] sm:max-lg:[--foot-copy-min:200px] sm:max-lg:[--cta-h:50px] max-lg:[--foot-bottom-min:5cqw] max-lg:[--head-min:6.6667cqw] max-lg:[--head-w-min:44cqw] ${className ?? ""}`}
  >
    <div
      className="absolute overflow-hidden bg-surface-black text-foreground-on-dark"
      style={{ inset: px(EDGE) }}
    >
      <PaddockBackdrop className="absolute inset-0 z-0 [--paddock-contour:var(--footer-contour)]" />
    </div>

    {/* The figure sits on the **section**, not in the panel, and hangs past
        the foot: the suit runs to 809.8 in an 800 frame, so it covers the
        accent edge along the bottom. Clipped inside the panel it left a cyan
        strip there that the design does not have. The design's own order —
        suit first, helmet over it. */}
    {/* The pair scales as **one group**, about the foot of the block: the
          helmet's own top and the suit's own overhang are shares of the
          block's height, and shrinking the two separately pulled the helmet
          off the collar. Below `lg` it takes `--fig-scale`, and a nudge to
          the right with it: the group is pinned between the masthead above
          its crown and the nav column beside its cheek, and moving it off
          the block's middle is what buys the last of the size. */}
    {/* **Not on the phone.** The block there is a list — brand, five ways
          out, the legal row — and the helmet under it was a second screen of
          scrolling for an image the page has already shown three times. */}
    <div className="pointer-events-none absolute inset-0 z-10 origin-bottom max-sm:hidden [scale:var(--fig-scale,1)] [translate:var(--fig-shift,0)]">
      {/* Scroll parallax, over the pair together — see `PARALLAX_FIGURE` for
          why the window closes at `bottom bottom` rather than on a crossing,
          why the displacement is downward, and why the helmet does not get a
          layer of its own. Inside the group's own scale, so the travel scales
          with the figure. */}
      <SpringTrigger
        start="top bottom"
        end="bottom bottom"
        mode="scrub"
        from={{ top: px(PARALLAX_FIGURE) }}
        to={{ top: "0cqw" }}
        className="absolute inset-0"
        innerClassName="relative block size-full"
      >
        <Image
          src="/assets/footer/body.webp"
          alt=""
          width={1536}
          height={1024}
          // Height-driven from `lg`, width-driven below it — see the paddock's
          // figure for why: a portrait screen makes a height-sized figure grow
          // without limit against copy that has not.
          //
          // Masked to the suit. The export carries the driver's whole head —
          // and his own helmet — drawn larger than the helmet plate in front,
          // so its right edge showed as a second helmet behind the first. See
          // `FIGURE.body.suitFrom`.
          className="pointer-events-none absolute z-10 h-[var(--h)] w-auto max-w-none -translate-x-1/2 select-none object-cover aspect-[var(--a)] [mask-image:linear-gradient(to_bottom,transparent_var(--suit-from),black_var(--suit-to))] [-webkit-mask-image:linear-gradient(to_bottom,transparent_var(--suit-from),black_var(--suit-to))]"
          style={
            {
              left: `${FIGURE.body.centre * 100}%`,
              bottom: `${FIGURE.body.bottom * 100}%`,
              "--h": `${FIGURE.body.heightShare * 100}%`,
              "--a": `${FIGURE.body.aspect}`,
              "--suit-from": `${FIGURE.body.suitFrom * 100}%`,
              "--suit-to": `${FIGURE.body.suitTo * 100}%`,
            } as React.CSSProperties
          }
        />
        <Image
          src="/assets/footer/helmet.webp"
          alt="Kimi Antonelli's helmet"
          width={1536}
          height={1024}
          priority={false}
          className="pointer-events-none absolute z-10 h-[var(--h)] w-auto max-w-none -translate-x-1/2 select-none object-cover aspect-[var(--a)]"
          style={
            {
              left: `${FIGURE.helmet.centre * 100}%`,
              top: `${FIGURE.helmet.top * 100}%`,
              "--h": `${FIGURE.helmet.heightShare * 100}%`,
              "--a": `${FIGURE.helmet.aspect}`,
            } as React.CSSProperties
          }
        />
      </SpringTrigger>
    </div>

    {/* The copy sits on the **section**, not inside the panel: the design's
        coordinates are frame-relative — the nav at 32, the masthead's right
        edge at 1408 — and nesting them in a panel inset 16 pushed the lot 16
        in on both axes. The panel keeps only the artwork it has to clip. */}
    <FooterContent content={content} />
  </section>
);
