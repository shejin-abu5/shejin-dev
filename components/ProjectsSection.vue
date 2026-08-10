<script setup lang="ts">
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useReveal } from '~/composables/useReveal'
import { BALL_QUERY, registerPerch, useBallPerch } from '~/composables/useScrollBall'
import { useSwipeRail } from '~/composables/useSwipeRail'
import newPatrolImg from '~/assets/img/works/new-patrol.webp'
import partsImg from '~/assets/img/works/Genuine-Nissan-Parts-GHANA.webp'
import magniteImg from '~/assets/img/works/magnite.webp'
import infinitiImg from '~/assets/img/works/infiniti.webp'
import petrominImg from '~/assets/img/works/Nissan-KSA-Petromin.webp'
import smartImg from '~/assets/img/works/smart.webp'

interface Project {
  brand: string
  title: string
  summary: string
  tech: string
  demoUrl: string | null
  liveUrl: string | null
  demoLabel: string | null
  image: string | null
}

const projects: Project[] = [
  {
    brand: 'Nissan',
    title: 'New Patrol Launch Platform',
    summary:
      'Launch platform for the new Nissan Patrol across Middle East and Africa markets. Built the frontend from Figma designs and the GSAP/WebGL launch animation.',
    tech: 'Vue.js · GSAP · WebGL',
    demoUrl: null,
    liveUrl: 'https://en.allnewpatrol.nissan-dubai.com/',
    demoLabel: 'allnewpatrol.nissan-dubai.com',
    image: newPatrolImg
  },
  {
    brand: 'Nissan',
    title: 'Parts e-commerce',
    summary:
      'Storefront for ordering genuine Nissan parts. Built the frontend and connected it to the parts catalog and checkout APIs.',
    tech: 'Vue.js · Pinia · Tailwind CSS',
    demoUrl: null,
    liveUrl: 'https://parts.nissanghana.com/',
    demoLabel: null,
    image: partsImg
  },
  {
    brand: 'Nissan',
    title: 'Magnite Microsite',
    summary:
      'Model microsite for the Nissan Magnite, including the Arabic/English RTL layout.',
    tech: 'GSAP · Tailwind CSS',
    demoUrl: null,
    liveUrl: 'https://en.allnewmagnite.nissan-saudiarabia.com/',
    demoLabel: null,
    image: magniteImg
  },
  {
    brand: 'Nissan',
    title: 'Smart Test Drive',
    summary:' Smart Test Drive tool for great customer experience.',
    tech: 'Vue.js · Google Maps API',
    demoUrl: 'https://smartdrive-app.alt-test-server.com/en/choose-language?showroomId=0010N00004IfscmQAB&debug=true',
    liveUrl: null,
    demoLabel: null,
    image: smartImg
  },
  
  {
    brand: 'INFINITI',
    title: 'Inventory Tool',
    summary: 'Dealership-facing tool for browsing vehicle inventory, built on top of the inventory data API.',
    tech: 'Vue.js · Axios',
    demoUrl: null,
    liveUrl: 'https://www.infiniti-dubai.com/infiniti-certified.html',
    demoLabel: null,
    image: infinitiImg
  },
  {
    brand: 'Nissan',
    title: 'Petromin KSA',
    summary:
      'Dealer website for Nissan in Saudi Arabia, part of the Middle East rollout with RTL-aware layouts.',
    tech: 'Vanilla JS · SASS',
    demoUrl: null,
    liveUrl: 'https://en.petromin-nissan.com/',
    demoLabel: null,
    image: petrominImg
  }
]

// Each card shows one link: the production URL when the work is live, the
// demo/staging URL otherwise. The label falls back to the host — which is what
// the one hand-written `demoLabel` already was — so a demo URL carrying a query
// string doesn't have to be readable to be linkable.
function hostLabel(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url.replace(/^https?:\/\//, '').replace(/\/$/, '')
  }
}

const cards = projects.map((project) => {
  const url = project.liveUrl ?? project.demoUrl
  return {
    ...project,
    link: url ? { url, label: project.demoLabel ?? hostLabel(url) } : null
  }
})

const sectionRef = ref<HTMLElement | null>(null)
const railRef = ref<HTMLElement | null>(null)
const stackEnded = ref(false)

// Below lg the deck is a swipe rail — see composables/useSwipeRail.ts and
// `.swipe-rail` in assets/css/main.css. `deckRef` is the same element in both
// presentations: a plain block that holds the sticky cards above lg, the
// scroll container below it.
const deckRef = ref<HTMLElement | null>(null)
const { active, isRail, goTo } = useSwipeRail(() => deckRef.value, '.work-card')

// Where along the deck's width the walk starts and finishes. The heading rule
// is its first step and the six cards are the rest, so the ball crosses the
// section once, left to right, rather than resetting on every card.
//
// Left to right and not the other way, though the other way looked better on
// paper: the experience chart starts at the left-hand end of its first card,
// so a deck finishing on the left would hand over with almost no distance to
// cover. What that ignores is that the last card has to *release* the ball
// while it is still on screen. The deck scrolls away well before the chart
// opens, and a ball still riding the last card at that point rides it up out
// of the frame and then snaps back down into the middle of the screen when the
// chart finally takes over — measured as a 120px jump appearing at full
// opacity from nothing. Finishing on the right means the handoff can go off
// the edge of the frame instead, which is what `side` is for.
const DECK_FROM = 0.14
const DECK_TO = 0.88

// The ball rides down the deck: the rule under the section heading first, then
// the top edge of each card as that card comes to the front of the stack.
//
// It used to roll off the right edge of the frame instead and stay off it
// until the experience chart, on the reasoning that a ball crossing in front
// of the cards competes with the thing it is meant to be leading you to. What
// that cost, measured, was three viewports of scroll — a third of the page —
// with no ball on screen at all, which is a longer absence than the journey
// can carry. Riding the deck keeps it present without putting it over any
// copy: a card's top edge is its border, and the ball sits on it.
//
// The rule is the first step of that walk and the cards are the rest — see
// DECK_FROM — so the whole section reads as one crossing rather than seven.
useBallPerch(() => railRef.value, {
  trigger: () => railRef.value,
  // In frame, not below it. At 106% the ball landed on a rule that was still
  // a screen's-worth under the fold, so it spent the fall diving to meet it —
  // measured at 3.3px of descent per px of scroll, down to within 70px of the
  // bottom edge — and then rode back up as the rule came into view. A ball
  // that plunges off the bottom of the screen and returns is not a hop, and it
  // was the one place on the page where the vertical read faster than the
  // horizontal. Landing on a rule that is already in frame makes the fall a
  // fall.
  start: 'top 88%',
  // A quarter of the frame, not the 86% of it this used to claim.
  //
  // The window a section declares is not free. layout() spends the scroll in a
  // run on the legs that need it, but it also walks backwards from the end of
  // the run working out what every perch after this one is owed — and a perch
  // may not be handed the ball later than that arithmetic allows, even when its
  // own trigger says it should be. A fat declaration here is therefore charged
  // against the *fall into it*: measured at 1920×1080, this rule's 928px window
  // for a 165px roll (0.19px per px of scroll, a quarter of the cruise) forced
  // the hop out of the hero to land ~620px before this trigger's own `top 88%`,
  // which is a rule still half a screen under the fold. The dive off the bottom
  // of the frame the comment above describes was never fixed by moving the
  // start line; it was only moved out of this section's own arithmetic.
  //
  // Short enough that the roll runs near ROLL_SPEED and the slack goes back to
  // the fall, which is the leg that has somewhere to be.
  end: 'top 62%',
  // One step's worth, handing straight on to the first card. How long that
  // takes is no longer this section's business — the ball paces its own
  // journey now, and will give the roll the scroll it needs or shorten the
  // roll if the page has none to give. See layout() in TheScrollBall.vue.
  to: DECK_FROM
})

let stackEndObserver: IntersectionObserver | null = null
let deckMedia: ReturnType<typeof gsap.matchMedia> | null = null

onMounted(() => {
  // Cards rise into view through the blur band, which owns the bottom ~22vh.
  // At the default 88% line the fly-in plays out entirely behind that blur and
  // the card surfaces already-arrived. Triggering above the band spends the
  // motion where it can actually be seen.
  useReveal(sectionRef.value, '.reveal', 'top 74%')

  const cardEls = sectionRef.value?.querySelectorAll<HTMLElement>('.work-card')
  const sentinel = sectionRef.value?.querySelector('[data-stack-end]')
  if (!cardEls?.length || !sentinel) return

  // Once the last card has settled there is nothing left below it to rise out
  // of the blur, so the band gets out of the way rather than sitting on it.
  //
  // The sentinel sits at the last card's flow position and that card pins at
  // `pinOffset`, so the moment the sentinel crosses that line is exactly the
  // moment the card settles — independent of viewport and card height. A
  // discrete class toggle, not a scroll handler, so it can't jitter.
  const pinOffset = parseFloat(getComputedStyle(cardEls[cardEls.length - 1]).top) || 0

  // The huge bottom inset is load-bearing: it stretches the root box far past
  // the viewport so the sentinel is either above the pin line or inside the
  // box, never in a third "below the viewport" state. With only two states,
  // isIntersecting always flips on a fast scroll or an anchor jump. Bounding
  // the box at the viewport instead lets both sides read isIntersecting:false,
  // and a fling that skips the crossing frame leaves the band stuck off.
  stackEndObserver = new IntersectionObserver(
    ([entry]) => {
      stackEnded.value = !entry.isIntersecting
    },
    { rootMargin: `-${pinOffset}px 0px 100000px 0px` }
  )

  stackEndObserver.observe(sentinel)

  // One perch per card, gated on the same query the ball itself is gated on so
  // the two can never disagree about whether the journey is running. Below lg
  // the deck is a swipe rail and none of this exists.
  //
  // registerPerch rather than useBallPerch because a card's window is not
  // expressible as one trigger's start and end: a card is the front of the
  // deck from the moment it sticks until the *next* card sticks over it, which
  // is two different elements' geometry.
  deckMedia = gsap.matchMedia()
  deckMedia.add(BALL_QUERY, () => {
    const deck = Array.from(cardEls)
    if (deck.length < 2) return

    // Read off the element rather than recomputing `--band + index * 10px` by
    // hand, so the stacking offset stays defined in exactly one place. Called
    // per refresh, so a viewport change that moves the band re-resolves it.
    const stickAt = (i: number) => parseFloat(getComputedStyle(deck[i]).top) || 0

    const sts = deck.map((el, i) =>
      ScrollTrigger.create({
        trigger: el,
        start: () => `top top+=${stickAt(i)}`,
        // The card that covers this one ends it. The last has nothing above
        // it, so it holds the ball until the deck itself is leaving.
        endTrigger: i + 1 < deck.length ? deck[i + 1] : el,
        end:
          i + 1 < deck.length
            ? () => `top top+=${stickAt(i + 1)}`
            : () => `+=${Math.round(window.innerHeight * 0.5)}`
      })
    )

    const step = (i: number) => DECK_FROM + (DECK_TO - DECK_FROM) * (i / deck.length)

    const offs = deck.map((el, i) =>
      registerPerch({
        surface: () => el,
        range: () => [sts[i].start, sts[i].end],
        // Each card carries the ball one step of the way across, so the deck
        // reads as one continuous walk rather than six rolls that each reset
        // to the left-hand edge.
        from: () => step(i),
        to: () => step(i + 1),
        // A card sits 10px below the one it covers, so the hop between them is
        // a step down rather than a fall, and the default crossing — sized for
        // getting between sections — would hang the ball in the air over it.
        fall: 0.07,
        // The last card hands over to the experience chart, which is a whole
        // section away and starts at the left-hand edge again. Off the right
        // of the frame and back in at the left, rather than an arc across
        // everything in between — and it has to leave while the card is still
        // in frame, since the deck scrolls away long before the chart opens.
        side: i === deck.length - 1,
        // Clear of the 22px corner radius.
        inset: 26
      })
    )

    return () => {
      for (const off of offs) off()
      for (const st of sts) st.kill()
    }
  })
})

onBeforeUnmount(() => {
  stackEndObserver?.disconnect()
  deckMedia?.revert()
})
</script>

<template>
  <section id="work" ref="sectionRef" class="relative py-12 md:py-[160px]">
    <div class="mx-auto max-w-[1320px] px-6 md:px-12">
      <div class="reveal mb-9 flex flex-wrap items-end justify-between gap-6 md:mb-11">
        <div>
          <span class="mb-3.5 block font-data text-[13px] tracking-wide text-accent-text">
            01 — Selected work
          </span>
          <h2 class="font-display text-[clamp(30px,4.5vw,58px)] font-black uppercase leading-none tracking-tight">
            Selected Work
          </h2>
        </div>
      </div>

      <span ref="railRef" class="mb-20 md:block hidden h-px w-full bg-hair md:mb-28" aria-hidden="true" />
    </div>

    <div class="mx-auto max-w-[1320px] px-6 md:px-12 md:pt-0 pt-3">
      <div
        ref="deckRef"
        class="work-deck swipe-rail"
        :role="isRail ? 'group' : undefined"
        :aria-roledescription="isRail ? 'carousel' : undefined"
        :aria-label="isRail ? 'Selected work' : undefined"
        :tabindex="isRail ? 0 : undefined"
        @keydown.arrow-left.prevent="goTo(active - 1)"
        @keydown.arrow-right.prevent="goTo(active + 1)"
      >
        <template v-for="(project, i) in cards" :key="project.title">
          <div v-if="i === cards.length - 1" data-stack-end aria-hidden="true" class="h-px w-full" />

          <article
            class="work-card rounded-[16px] bg-paper px-5 py-6 ring-1 ring-hair md:rounded-[22px] md:px-8 md:py-7"
            :class="{ 'work-card--peek': isRail && active !== i }"
            :style="{ '--index': i, zIndex: i + 1 }"
          >
            <div class="work-card__grid grid grid-cols-1 items-center gap-4 xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] xl:gap-8">
              <div class="reveal min-w-0 xl:max-w-[270px]">
                <div class="flex items-center gap-2.5">
                  <span class="font-data text-[12px] text-steel">{{ String(i + 1).padStart(2, '0') }}</span>
                  <span class="font-data text-[10px] uppercase tracking-[0.18em] text-accent-text">
                    {{ project.brand }}
                  </span>
                </div>
                <h3 class="mt-3 font-display md:text-xl text-lg font-bold uppercase leading-tight tracking-tight md:text-[25px]">
                  {{ project.title }}
                </h3>
                <p class="mt-3 text-[13px] leading-relaxed text-steel">{{ project.summary }}</p>
              </div>

              <figure
                class="work-hero order-first w-full overflow-hidden rounded-[12px] bg-paper-soft ring-1 ring-hair xl:order-none xl:w-auto xl:aspect-[3/2]"
              >
                <img
                  v-if="project.image"
                  :src="project.image"
                  :alt="`${project.brand} ${project.title} screenshot`"
                  loading="lazy"
                  class="h-full w-full object-cover object-top max-xl:aspect-[3/2]"
                />
                <div
                  v-else
                  class="flex h-full w-full items-center justify-center py-16 font-data text-[11px] uppercase tracking-wide text-steel"
                >
                 coming soon
                </div>
              </figure>

              <div class="work-card__foot reveal min-w-0 xl:max-w-[230px] xl:justify-self-end xl:text-right">
                <span class="block font-data text-[10px] uppercase tracking-[0.18em] text-steel">Stack</span>
                <p class="mt-1.5 font-data text-[12px] leading-relaxed text-ink">{{ project.tech }}</p>

                <a
                  v-if="project.link"
                  :href="project.link.url"
                  :title="project.link.url"
                  target="_blank"
                  rel="noopener"
                  class="mt-4 flex min-h-[44px] items-center gap-2 font-data text-[12px] text-ink underline underline-offset-4 transition-colors hover:text-ink/85 xl:mt-6 xl:min-h-0 xl:justify-end xl:pl-4"
                >
                  <span class="min-w-0 truncate">{{ project.link.label }}</span>
                  <span class="shrink-0" aria-hidden="true">→</span>
                </a>
                <p v-else class="mt-2 font-data text-[12px] text-steel">Not listed</p>
              </div>
            </div>
          </article>
        </template>

        <div aria-hidden="true" class="work-stack-tail hidden xl:block" />
      </div>

      <div class="swipe-dots">
        <button
          v-for="(project, i) in cards"
          :key="`dot-${project.title}`"
          type="button"
          class="swipe-dot"
          :aria-label="`Show ${project.title}`"
          :aria-current="active === i ? 'true' : undefined"
          @click="goTo(i)"
        >
          <span />
        </button>
      </div>
    </div>

    <div class="work-fade" :class="{ 'work-fade--out': stackEnded }" aria-hidden="true">
      <div class="work-fade__blur work-fade__blur--1" />
      <div class="work-fade__blur work-fade__blur--2" />
      <div class="work-fade__blur work-fade__blur--3" />
      <div class="work-fade__tint" />
    </div>
  </section>
</template>

<style scoped>
/*
  The stacking and the blur band are the two things here Tailwind has no
  utility for: the per-card sticky offset is computed from the card's index,
  and the band is a masked stack of backdrop-filter layers (a single
  backdrop-filter can't ramp its blur radius across the element).
*/

section {
  /* One measure for both insets: the deck's top offset and the band's height
     are the same number, so a pinned card sits the same distance from the top
     of the viewport as it does from the top of the band. Changing this moves
     both ends together — that symmetry is the point, so don't split it back
     into two values. */
  --band: clamp(150px, 22vh, 240px);

  /* The hero has to be derived, not chosen, once the insets are symmetric.
     Budget: viewport, less both insets, less the 40px the last card sits
     below the first, less the card's 56px of vertical padding, less 24px so
     that card clears the band instead of grazing it. Capped for tall screens.

     Picking a flat 44vh instead fits only above ~930px of viewport height; at
     every laptop height below that the last card's bottom edge parks inside
     the blur and stays there.

     The floor only bites below ~570px of viewport height, where the deck is
     unusable anyway; it is there because a negative height is an invalid
     value, and the fallback to `auto` collapses a figure whose width and
     aspect-ratio are both derived from it. */
  --hero: max(180px, min(370px, calc(100vh - 2 * var(--band) - 120px)));
}

/* Cards pile into a deck, each offset 10px below the previous one so the
   covered cards keep a visible edge. Purely `position: sticky` — the
   compositor drives it, so it cannot stutter the way a scrubbed transform
   can. `--index` is set inline per card.

   The scroll cost of one card in the deck is its own height plus this gap, so
   the gap is the cheap knob for pacing the deck: it shortens the hand-off
   without touching the card's proportions. Kept just wide enough that a card
   fully clears the blur band before the next one starts covering it — drop it
   much further and the two events overlap, which reads as a skip. */
.work-card {
  position: sticky;
  top: calc(var(--band) + var(--index) * 10px);
  margin-bottom: 5vh;
  /* Two layers, because one can't do both jobs at this weight. The first is
     the deck's: cast upward, off the top edge, so a card reads as a sheet
     lying over the one it covers. The second is ambient — a short, soft seat
     all round, which is what actually makes the shadow visible against white
     once the cast layer is light enough not to look heavy. */
  box-shadow:
    0 -14px 36px -24px rgba(18, 18, 18, 0.24),
    0 2px 12px -4px rgba(18, 18, 18, 0.08);
}

/* Height-driven so the 3:2 screenshot is never cropped; the width follows.
   Only applies where the card is a three-column row — below xl it stacks and
   the image goes full-width, which is why this is a media query and not a
   plain rule. */
@media (min-width: 1280px) {
  .work-hero {
    height: var(--hero);
  }
}

/* Trailing room so the final card actually gets to pin. A sticky element can
   only travel inside its containing block, so when the container ended at the
   last card's bottom edge that card reached its offset and immediately kept
   scrolling — every other card holds while the next one covers it, and the
   rhythm broke at the end. Height matches one card plus the inter-card gap,
   which is exactly the scroll distance the other cards each hold for. */
.work-stack-tail {
  /* One card: the hero plus the card's vertical padding. */
  height: calc(var(--hero) + 56px);
}

.work-fade {
  --fade-height: var(--band);
  position: sticky;
  bottom: 0;
  z-index: 20;
  height: var(--fade-height);
  /* Overlap the tail of the stack instead of adding layout height. */
  margin-top: calc(var(--fade-height) * -1);
  pointer-events: none;
}

/* Set once the last card has settled — nothing is left below it to emerge
   from the blur, so the band dissolves and leaves the card sharp.

   The transition lives here, not on .work-fade, so it is deliberately
   one-way: fading out is graceful, but scrolling back up restores the band
   instantly. A symmetric fade means 400ms of three backdrop-filter layers
   re-sampling the backdrop every frame mid-scroll, which janks. */
.work-fade--out {
  opacity: 0;
  transition: opacity 400ms ease;
}

.work-fade__blur {
  position: absolute;
  inset: 0;
}

/* Each layer blurs harder and starts lower, so the masks add up to a blur
   that ramps toward the bottom edge rather than switching on at a hard line. */
.work-fade__blur--1 {
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
  mask-image: linear-gradient(to bottom, transparent 0%, #000 30%);
  -webkit-mask-image: linear-gradient(to bottom, transparent 0%, #000 30%);
}

.work-fade__blur--2 {
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  mask-image: linear-gradient(to bottom, transparent 30%, #000 62%);
  -webkit-mask-image: linear-gradient(to bottom, transparent 30%, #000 62%);
}

.work-fade__blur--3 {
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  mask-image: linear-gradient(to bottom, transparent 60%, #000 90%);
  -webkit-mask-image: linear-gradient(to bottom, transparent 60%, #000 90%);
}

/* Colour fade to the page background, so cards surface out of the paper
   rather than sliding under a visible grey slab. */
.work-fade__tint {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to bottom,
    rgba(255, 255, 255, 0) 0%,
    rgba(255, 255, 255, 0.55) 58%,
    theme('colors.paper') 100%
  );
}

/* Below xl the card is a single stacked column (image over text), so there is
   no deck to pin — and pinning one on a phone is a scroll-hijack that fights
   the user anyway. Must stay in step with the xl: prefixes in the template. */
@media (max-width: 1279px) {
  .work-card {
    position: static;
    margin-bottom: 2.5rem;
    /* Nothing to lift off here — the cards sit side by side rather than over
       one another — so only the ambient half of the deck's shadow, which is
       the half that has to carry it on its own. */
    box-shadow:
      0 4px 18px -6px rgba(18, 18, 18, 0.1),
      0 1px 4px -1px rgba(18, 18, 18, 0.06);
  }

  .work-fade {
    display: none;
  }
}

/* The rail. Must come after the block above so its margin reset wins, and
   must stay in step with `.swipe-rail` in assets/css/main.css and with
   RAIL_QUERY in composables/useSwipeRail.ts. */
@media (max-width: 1023px) {
  .work-deck {
    /* Matches the container's px-6, so the first card starts on the same
       margin as the heading over it. */
    padding-bottom: 1.5rem;
    --rail-gutter: 1.5rem;
    /* The card takes 85% of the frame and the cut next to it gets the other
       15% — the two are the same number, since --rail-item is derived as
       100% - --rail-peek, so a slide can only be widened by taking it out of
       the peek. A percentage rather than a rem keeps that split fixed at
       every width. The 0.875rem gap comes out of the visible cut, so what
       actually shows of the next card is 15% less about 14px. */
    --rail-peek: 15%;
  }

  .work-card {
    /* The rail spaces the cards; the stacked list's bottom margin would show
       up as dead width at the end of a horizontal row. */
    margin-bottom: 0;
    display: flex;
    flex-direction: column;
  }

  /* Every card but the one holding the frame — in practice the half-cut one
     at the edge, since it is the only other one on screen. Held back far
     enough to sit behind the card you are reading and no further: the peek
     has to stay legible as a card, because looking like the next one is what
     makes it worth swiping to.

     Set from `active`, not from a scroll position, so it changes on the same
     signal the dots do and the two can't disagree — see useSwipeRail.ts. */
  .work-card--peek {
    opacity: 0.55;
    transition: opacity 260ms ease;
  }

  /* Cards are stretched to a common height by the rail, so the slack has to
     go somewhere, and the last row is where it lands. `items-center` in the
     template would centre each row in its track, which puts the foot mid-slack.
  */
  .work-card__grid {
    flex: 1;
    grid-template-rows: auto auto 1fr;
    align-items: start;
  }

  /* The slack is split rather than given to one end. The stack follows the
     summary at the row gap — parking the whole foot on the floor put the
     difference between the longest summary and the shortest into a hole right
     under the description — while the link alone takes the leftover and sits
     on the card's floor, so it lands in the same place on every slide. */
  .work-card__foot {
    align-self: stretch;
    display: flex;
    flex-direction: column;
  }

  /* The link, or the "Not listed" line standing in for it. `auto` collapses
     to nothing on the tallest card, which is the one with no slack to spend,
     so the padding is what guarantees it never closes up on the stack. */
  .work-card__foot > :last-child {
    margin-top: auto;
    padding-top: 1rem;
  }

  /* Marks a flow position for the blur band, which is an xl-only device. In
     the rail it would otherwise be a full-width flex item wedged between two
     cards. */
  [data-stack-end] {
    position: absolute;
  }
}

@media (min-width: 768px) and (max-width: 1023px) {
  .work-deck {
    /* Follows the container to md:px-12. */
    --rail-gutter: 3rem;
  }
}

/* Two `prefers-reduced-motion: reduce` blocks used to sit here: one unwinding
   the deck back to a stacked list above lg, one killing the peek card's fade
   ramp below it. Both are gone with the gate — see BALL_QUERY in
   composables/useScrollBall.ts. The deck is driven by BALL_QUERY, which is now
   width-only, so unwinding it on a preference would strand the cards the
   timeline is still placing. */
</style>
