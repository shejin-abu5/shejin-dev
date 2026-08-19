<script setup lang="ts">
import { gsap } from 'gsap'
import { useReveal } from '~/composables/useReveal'

type IconKey = 'code' | 'layers' | 'pointer' | 'layout'

interface ExperienceItem {
  years: string
  /** Condensed range for the headline of the tenure box. */
  period: string
  role: string
  company: string
  icon: IconKey
  current?: boolean
  bullets: string[]
}

// Stroke paths on a 24 grid, drawn with currentColor. Inline rather than an
// icon package — four glyphs is not worth a dependency, and they have to
// render inside the 3D layer without a wrapper element.
const icons: Record<IconKey, string[]> = {
  code: ['M8.5 5.5 3 12l5.5 6.5', 'M15.5 5.5 21 12l-5.5 6.5'],
  layers: ['M12 3.5 3.5 8 12 12.5 20.5 8 12 3.5Z', 'M3.5 12 12 16.5 20.5 12', 'M3.5 16 12 20.5 20.5 16'],
  pointer: ['M4.5 3.5 19.5 10.5 12.9 12.9 10.5 19.5 4.5 3.5Z'],
  layout: ['M4 4.5h16v15H4z', 'M4 10h16', 'M10 10v9.5']
}

const items: ExperienceItem[] = [
  {
    years: 'Aug 2020 — Present',
    period: '2020 — NOW',
    role: 'Senior Frontend / UI Developer',
    company: 'Alternative Agency, Dubai, UAE',
    icon: 'code',
    current: true,
    bullets: [
      'Lead frontend development for automotive CMS platforms across 8+ regional markets, including the Vue.js component library behind the sites of several global automotive brands.',
      'Architect interactive showroom tools and configurators, translating Figma designs into production builds with GSAP and WebGL.',
      'Build multilingual Arabic/English site variants with RTL-aware layouts for KSA, UAE, and North Africa rollouts.',
      'Integrate third-party systems — auth, payments, mapping, CRM — working directly with backend teams on API contracts.'
    ]
  },
  {
    years: 'Mar 2017 — Jun 2020',
    period: '2017 — 2020',
    role: 'Frontend Developer',
    company: 'Golden Star Media Production & Event Management, Dubai, UAE',
    icon: 'layers',
    bullets: [
      'Built web applications in React.js and Vue.js, using Redux for shared state across greenfield builds and iterative feature work.',
      'Developed responsive interfaces with Vue Material, Ionic 4, and SASS for cross-device consistency.'
    ]
  },
  {
    years: 'Aug 2016 — Dec 2016',
    period: '2016',
    role: 'UI/UX Developer',
    company: 'Tecrizon, Infopark, Kochi, Kerala, India',
    icon: 'pointer',
    bullets: [
      'Designed and implemented UI and UX flows for web-based client projects, including wireframing and front-end build phases.'
    ]
  },
  {
    years: 'Mar 2014 — Jul 2016',
    period: '2014 — 2016',
    role: 'UI Developer',
    company: 'GL Infotech, Thrissur, Kerala, India',
    icon: 'layout',
    bullets: [
      'Started career building UI components and static/dynamic web pages — a foundation in HTML, CSS, and JavaScript.'
    ]
  }
]

// Badge fill steps from full accent on the current role to a soft tint on the
// earliest one, so flipping back through the career visibly cools off. Derived
// from the index rather than hard-coded per item, so adding an entry re-spaces
// the ramp instead of needing a new colour picked by hand. 0.42 is as far
// toward white as the white glyph stays legible.
const ACCENT: [number, number, number] = [255, 74, 31]

function badgeTint(i: number): string {
  const t = items.length > 1 ? (i / (items.length - 1)) * 0.42 : 0
  const [r, g, b] = ACCENT.map((c) => Math.round(c + (255 - c) * t))
  return `rgb(${r} ${g} ${b})`
}

// Four long bullets need a wider, smaller-set box to stay clear of the badge;
// one or two can sit narrow and large. Driven off the content so a future
// entry lands in the right bucket on its own.
function pointsVars(item: ExperienceItem) {
  const dense = item.bullets.length > 3
  return {
    '--exp-points-w': dense ? '64%' : '56%',
    '--exp-points-fs': dense ? '13px' : '14px',
    '--exp-points-lh': dense ? '1.5' : '1.6'
  }
}

const sectionRef = ref<HTMLElement | null>(null)
const deckRef = ref<HTMLElement | null>(null)
const activeIndex = ref(0)

// False during SSR and on the static (small-screen / reduced-motion) path, so
// every card stays in the accessibility tree and in the crawled HTML. Only the
// live carousel hides the three cards you cannot currently see.
const carouselActive = ref(false)

let mm: ReturnType<typeof gsap.matchMedia> | null = null

onMounted(() => {
  useReveal(sectionRef.value)

  mm = gsap.matchMedia()

  // Must stay in step with the two media queries in <style> — the transforms,
  // the pin, and the layout all switch at the same line.
  mm.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', () => {
    const cards = Array.from(deckRef.value?.querySelectorAll<HTMLElement>('.exp-card') ?? [])
    if (!cards.length) return

    const last = items.length - 1
    const state = { p: 0 }

    // Perspective per card, not on a shared ancestor. With one `perspective` on
    // the stage the vanishing point is the stage's centre, so each card warps
    // by however far it sits from that point and the deep layers get magnified
    // off-axis — that is the shrink-and-wobble. Owning it per card puts the
    // vanishing point at the card's own centre, so the turn is symmetric and
    // independent of where the deck lands in the viewport.
    //
    // It goes through GSAP as `transformPerspective` rather than CSS because
    // GSAP writes the whole `transform` property each frame; a perspective()
    // set in the stylesheet would be overwritten on the first tick.
    gsap.set(cards, { transformPerspective: 1800, transformOrigin: '50% 50%' })

    // quickSetters skip GSAP's per-call property parsing — these run on every
    // scroll frame, so that overhead is the difference between a clean scrub
    // and a stuttering one.
    const setters = cards.map((card) => ({
      rot: gsap.quickSetter(card, 'rotationY', 'deg'),
      fade: gsap.quickSetter(card, 'opacity')
    }))

    // Each card's angle is a pure function of scroll position, so scrubbing
    // backwards and parking mid-flip both fall out for free.
    //
    // The clamp is load-bearing. Ungated, card 0 at p = 2.2 works out to -396°,
    // which wraps to -36° — front-facing — so a card you finished with two
    // flips ago swings back into view. Clamped, a finished card parks at ±180°
    // and only the two cards adjacent to p are ever mid-turn.
    const apply = () => {
      for (let i = 0; i < setters.length; i++) {
        const d = gsap.utils.clamp(-1, 1, state.p - i)
        setters[i].rot(d * -180)
        // Fade out over the last third of the approach to edge-on (|d| 0.32 →
        // 0.5, i.e. 58° → 90°). Two jobs: it softens what would otherwise be a
        // hard blink at 90°, and it hides the tail of the turn where the near
        // edge of the widest layer is most magnified.
        setters[i].fade(gsap.utils.clamp(0, 1, (0.5 - Math.abs(d)) / 0.18))
      }

      // Guarded because this is a reactive write on a scroll frame: unguarded,
      // every tick re-runs the aria-hidden and rail bindings during the turn.
      const next = Math.round(gsap.utils.clamp(0, last, state.p))
      if (next !== activeIndex.value) activeIndex.value = next
    }

    apply()
    carouselActive.value = true

    gsap.timeline({
      scrollTrigger: {
        trigger: sectionRef.value,
        start: 'top top',
        // ~90vh of scroll per flip. A function plus invalidateOnRefresh so a
        // resize recomputes the distance instead of keeping whatever the
        // viewport measured at load.
        end: () => `+=${last * window.innerHeight * 0.9}`,
        pin: true,
        pinSpacing: true,
        scrub: 0.8,
        anticipatePin: 1,
        invalidateOnRefresh: true
      }
    }).to(state, { p: last, ease: 'none', onUpdate: apply })

    // Runs when the query stops matching (resize past lg, or the OS motion
    // setting flips). gsap.matchMedia reverts the timeline and the pin itself;
    // this only clears what was written by hand.
    return () => {
      carouselActive.value = false
      activeIndex.value = 0
      gsap.set(cards, { clearProps: 'all' })
    }
  })
})

onBeforeUnmount(() => {
  mm?.revert()
})
</script>

<template>
  <section
    id="experience"
    ref="sectionRef"
    class="bg-paper-soft py-24 md:py-[100px] lg:flex lg:min-h-screen lg:flex-col lg:justify-center lg:pb-4 lg:pt-20"
  >
    <div class="mx-auto w-full max-w-[1240px] px-5 md:px-8">
      <div class="reveal mb-12 flex flex-wrap items-end justify-between gap-6 lg:mb-6">
        <div>
          <span class="mb-3.5 block font-data text-[13px] tracking-wide text-accent-text">02 — Career</span>
          <h2 class="font-display text-[clamp(30px,4.5vw,58px)] font-black uppercase leading-none tracking-tight">
            Experience
          </h2>
        </div>
        <!-- <p class="max-w-[340px] text-[15px] leading-relaxed text-steel">
          Progression from static HTML/CSS builds to leading frontend architecture for
          regional CMS platforms across 8+ markets.
        </p> -->
      </div>

      <!-- The 3D stage. Height is budgeted against the viewport: the section
           pins, so header + deck + rail + padding has to fit inside 100vh. -->
      <div class="exp-stage">
        <div
          ref="deckRef"
          class="exp-deck space-y-8 lg:relative lg:mx-auto lg:h-[clamp(450px,calc(100vh-296px),520px)] lg:max-w-[1000px] lg:space-y-0"
        >
          <article
            v-for="(item, i) in items"
            :key="item.years"
            class="exp-card relative lg:absolute lg:inset-0"
            :style="{ ...pointsVars(item), '--exp-badge-bg': badgeTint(i) }"
            :aria-hidden="carouselActive && i !== activeIndex ? 'true' : undefined"
          >
            <!-- Backing slab. Decorative depth only — it carries no content, so
                 the static layout drops it rather than stacking an empty grey
                 box behind every entry. -->
            <div
              class="exp-layer exp-panel hidden rounded-[28px] bg-[#F2F0EB] lg:absolute lg:left-[32%] lg:top-0 lg:block lg:h-full lg:w-[36%]"
              aria-hidden="true"
            />

            <!-- Discipline mark. Deepest layer of the five, so it swings on the
                 widest radius and separates hardest through a flip. -->
            <div
              class="exp-layer exp-badge flex h-[52px] w-[52px] items-center justify-center rounded-full lg:absolute lg:left-1/2 lg:top-[31%] lg:h-[120px] lg:w-[120px]"
              aria-hidden="true"
            >
              <svg
                class="h-[24px] w-[24px] lg:h-[52px] lg:w-[52px]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.7"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path v-for="d in icons[item.icon]" :key="d" :d="d" />
              </svg>
            </div>

            <!-- Role + company -->
            <div
              class="exp-layer exp-role rounded-[18px] bg-paper p-6 lg:absolute lg:left-[5%] lg:top-[10%] lg:w-[30%] lg:p-7"
            >
              <h3 class="font-display text-[19px] font-bold uppercase leading-tight tracking-tight lg:text-[21px]">
                {{ item.role }}
              </h3>
              <p class="mt-2 font-data text-[13px] leading-relaxed text-steel">{{ item.company }}</p>
            </div>

            <!-- Tenure -->
            <div
              class="exp-layer exp-year rounded-[18px] bg-paper p-6 lg:absolute lg:left-[67%] lg:top-[31%] lg:w-[30%] lg:p-7"
            >
              <p class="flex items-center gap-2 font-data text-[12px] text-steel">
                <span v-if="item.current" class="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                {{ item.years }}
              </p>
              <p class="mt-1.5 font-display text-[22px] font-black uppercase leading-none tracking-tight lg:text-[32px]">
                {{ item.period }}
              </p>
            </div>

            <!-- Responsibilities. Anchored to the stage's bottom edge, because
                 the four entries have very different bullet counts and a
                 top-anchored box would run one of them off the stage. Width and
                 type size come from --exp-points-*, set per entry above. -->
            <div
              class="exp-layer exp-points rounded-[18px] bg-paper p-6 lg:absolute lg:bottom-0 lg:left-[2%]"
            >
              <ul class="list-none">
                <li
                  v-for="bullet in item.bullets"
                  :key="bullet"
                  class="exp-bullet relative mb-2.5 pl-5 text-[14px] leading-[1.6] text-steel last:mb-0 before:absolute before:left-0 before:text-hair before:content-['—']"
                >
                  {{ bullet }}
                </li>
              </ul>
            </div>
          </article>
        </div>

        <!-- Progress rail. A pinned section owes the reader some sense of how
             much is left, and the flip on its own does not give it — more so
             now the badge is a mark rather than a number. -->
        <div class="exp-rail mt-9 hidden items-center gap-4 lg:flex" aria-hidden="true">
          <div class="flex gap-1.5">
            <span
              v-for="(item, i) in items"
              :key="item.years"
              class="h-[3px] w-9 rounded-full transition-colors duration-300"
              :class="i === activeIndex ? 'bg-accent' : 'bg-hair'"
            />
          </div>
          <span class="font-data text-[12px] text-steel">
            {{ String(activeIndex + 1).padStart(2, '0') }} / {{ String(items.length).padStart(2, '0') }}
          </span>
        </div>

        <p class="sr-only" aria-live="polite">
          <template v-if="carouselActive">
            Experience {{ activeIndex + 1 }} of {{ items.length }}:
            {{ items[activeIndex].role }}, {{ items[activeIndex].company }}
          </template>
        </p>
      </div>
    </div>
  </section>
</template>

<style scoped>
/*
  Everything here is what Tailwind has no utility for: the 3D context, the
  per-layer depth that makes the flip read as an assembly of floating boxes
  rather than one rigid printed sheet, and the teardown back to a flat list.

  The two media queries below are exhaustive and mutually exclusive, and they
  match the gsap.matchMedia query in <script> exactly. Change one, change all
  three — a gap between them means absolutely-positioned cards with nothing
  driving their rotation, which stacks all four on top of each other.
*/

.exp-badge {
  background: var(--exp-badge-bg);
  color: theme('colors.paper');
}

@media (min-width: 1024px) and (prefers-reduced-motion: no-preference) {
  /* No `perspective` here on purpose — each card owns its own via GSAP's
     transformPerspective. A shared one anchors the vanishing point to this
     box's centre, which makes the warp depend on where the deck sits inside
     it and magnifies the off-axis layers. See the <script> note. */
  .exp-deck {
    transform-style: preserve-3d;
  }

  .exp-card {
    transform-style: preserve-3d;
    will-change: transform, opacity;
  }

  /* Promoted for the same reason as the card: under preserve-3d a layer is
     re-rasterised as its parent turns, and text re-rasterising every frame is
     what reads as shimmer. */
  .exp-layer {
    will-change: transform;
  }

  /* Pre-hydration state, matching what apply() writes at p = 0 — including the
     perspective, so the first GSAP tick is not a visible jump. Without it the
     four cards render face-on in the same box for a frame and flash as one
     unreadable pile. */
  .exp-card:not(:first-child) {
    transform: perspective(1800px) rotateY(180deg);
  }

  /* Hides a card the instant it passes 90°, which is also the instant the
     incoming card crosses back under 90°. That edge is the content swap —
     nothing to crossfade, no mirrored text to mask.

     Needed on the layers as well as the card: under preserve-3d each child
     resolves its own backface, so without this the boxes stay painted
     (reversed) while the card behind them already faces away. */
  .exp-card,
  .exp-layer {
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
  }

  /* The depth ladder. Coplanar layers would turn as one sheet; at staggered Z
     each box travels its own radius, so the assembly pulls apart through the
     turn and re-converges square on.

     Kept shallow relative to the 1800px perspective — depth is what magnifies
     a layer's near edge as it swings forward, and the wide bullets box is the
     one that shows strain first. Shadows are modest for the same reason: a
     wide, soft shadow re-blurred every frame is the most expensive thing on
     the compositor here. */
  .exp-panel {
    transform: translateZ(0);
  }

  .exp-role {
    transform: translateZ(48px);
    box-shadow: 0 14px 32px -16px rgba(18, 18, 18, 0.2);
  }

  /* Centred on the badge's axis rather than top-aligned, so the pair reads as
     one horizontal beat the way the reference does — and stays aligned as the
     stage height flexes with the viewport. */
  .exp-year {
    transform: translateY(-50%) translateZ(52px);
    box-shadow: 0 14px 32px -16px rgba(18, 18, 18, 0.2);
  }

  .exp-points {
    width: var(--exp-points-w);
    transform: translateZ(60px);
    box-shadow: 0 18px 42px -20px rgba(18, 18, 18, 0.24);
  }

  .exp-bullet {
    font-size: var(--exp-points-fs);
    line-height: var(--exp-points-lh);
  }

  .exp-badge {
    /* Centring and depth have to be one declaration — a Tailwind translate
       utility here would overwrite the translateZ. */
    transform: translate(-50%, -50%) translateZ(80px);
    box-shadow: 0 20px 44px -20px rgba(255, 74, 31, 0.45);
  }
}

/* Static path: same five layers, ordinary flow, no pin and no 3D. Pinning a
   flip on a phone just fights the reader's thumb, and this is also the
   reduced-motion answer at any width — hence the lg: utilities in the template
   all get unwound here rather than only below the breakpoint. Mirrors how the
   Work section steps out of its sticky deck at the same line. */
@media (max-width: 1023px), (prefers-reduced-motion: reduce) {
  .exp-deck {
    height: auto;
    max-width: none;
  }

  .exp-card {
    position: relative;
    inset: auto;
    transform: none;
    opacity: 1;
  }

  .exp-card + .exp-card {
    border-top: 1px solid theme('colors.hair');
    padding-top: 2rem;
  }

  /* Nothing is progressing, so a progress rail is just a decoration that lies. */
  .exp-rail {
    display: none;
  }

  .exp-panel {
    display: none;
  }

  .exp-layer {
    position: relative;
    inset: auto;
    width: auto;
    transform: none;
    box-shadow: none;
  }

  /* The text boxes lose their card chrome: in one column, four white slabs on
     an almost-white page is just noise. The badge keeps its fill — it is the
     only colour anchor left. */
  .exp-role,
  .exp-year,
  .exp-points {
    padding: 0;
    background: transparent;
  }

  .exp-role {
    margin-top: 1.125rem;
  }

  .exp-year {
    margin-top: 0.875rem;
  }

  /* One column at desktop width would otherwise set these across the full
     1240px measure. */
  .exp-points {
    margin-top: 1.125rem;
    max-width: 760px;
  }

  .exp-badge {
    height: 52px;
    width: 52px;
  }
}
</style>
