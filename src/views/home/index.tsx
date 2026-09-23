import { homeContent } from "@/data/mocks/home";
import { isBot } from "@/utils/is-bot";

import { AnchorScroll } from "@/views/home/anchor-scroll";
import { SectionStack, StackLayer } from "@/views/home/section-stack";
import { Hero } from "@/views/home/sections/hero";
import { Season } from "@/views/home/sections/season";
import { Footer } from "@/views/home/sections/footer";
import { Paddock } from "@/views/home/sections/paddock";
import { Timeline } from "@/views/home/sections/timeline";

/**
 * Home view — Server Component. The hero effect, "the season so far", then
 * the career timeline, the paddock report, then the sign-off.
 * The bot check happens here (server) so crawlers get the poster and never
 * fetch the three.js chunk.
 *
 * The first three blocks are a **stack**: each pins at the top of the viewport
 * and the next one comes out over it, the covered one receding rather than
 * scrolling away. See `section-stack.tsx`. The timeline is the last layer, so
 * it covers but is never covered, and the page returns to ordinary flow under
 * it — the paddock and the footer follow it normally.
 */
export const HomeView = async () => {
  const bot = await isBot();

  return (
    <main>
      <SectionStack>
        <StackLayer z={0}>
          <Hero content={homeContent.hero} showScene={!bot} />
        </StackLayer>
        <StackLayer z={10} id="season">
          <Season content={homeContent.season} />
        </StackLayer>
        <StackLayer z={20} pinned={false} id="career">
          <Timeline content={homeContent.timeline} />
        </StackLayer>
      </SectionStack>
      <Paddock content={homeContent.paddock} id="paddock" />
      <Footer content={homeContent.footer} />
      <AnchorScroll />
    </main>
  );
};
