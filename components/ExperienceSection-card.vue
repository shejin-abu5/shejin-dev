<script setup lang="ts">
import { gsap } from 'gsap'
import { useReveal } from '~/composables/useReveal'

interface ExperienceItem {
  /** Full range with months — the static list. */
  years: string
  /** Condensed range for the floating card. */
  period: string
  role: string
  /** Full name with location — the static list. */
  company: string
  /** Short name; the full string is far too long for a card's bottom line. */
  org: string
  /** One sentence distilled from the first bullet — the floating card's body. */
  summary: string
  current?: boolean
  bullets: string[]
}

const items: ExperienceItem[] = [
  {
    years: 'Aug 2020 — Present',
    period: '2020 — NOW',
    role: 'Senior Frontend / UI Developer',
    company: 'Alternative Agency, Dubai, UAE',
    org: 'Alternative Agency',
    summary: 'Lead frontend for automotive CMS platforms across 8+ regional markets.',
    current: true,
    bullets: [
      'Lead frontend development for automotive CMS platforms across 8+ regional markets, including the Vue.js component library used across the Nissan and Ford sites.',
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
    org: 'Golden Star Media',
    summary: 'Built React and Vue applications with Redux-backed shared state.',
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
    org: 'Tecrizon',
    summary: 'Designed and built UI and UX flows for web client projects.',
    bullets: [
      'Designed and implemented UI and UX flows for web-based client projects, including wireframing and front-end build phases.'
    ]
  },
  {
    years: 'Mar 2014 — Jul 2016',
    period: '2014 — 2016',
    role: 'UI Developer',
    company: 'GL Infotech, Thrissur, Kerala, India',
    org: 'GL Infotech',
    summary: 'Started out building UI components and web pages in HTML, CSS, and JavaScript.',
    bullets: [
      'Started career building UI components and static/dynamic web pages — a foundation in HTML, CSS, and JavaScript.'
    ]
  }
]

// Horizontal lanes for the pinned deck. `x` percentages come from the
// reference screenshots, where cards 01/02/03 sit at ~7%, ~50% and ~17% of
// viewport width; lane 3 continues the alternation. `dwell` nudges a card off
// dead-centre when it parks, so the four resting positions are not identical.
// `drift` alternates so adjacent cards travel apart rather than in lockstep.
const LANES = [
  { x: 6, dwell: -34, drift: 1 },
  { x: 50, dwell: 28, drift: -1 },
  { x: 20, dwell: -22, drift: 1 },
  { x: 62, dwell: 40, drift: -1 }
]

// Each card runs its own rise → hold → exit cycle, measured in abstract units
// that UNIT_VH converts into real scrolling. The hold is the whole point: a
// card that never stops moving is a card you cannot read.
const RISE = 0.8
const HOLD = 1.4
const EXIT = 0.8
const SPAN = RISE + HOLD + EXIT

// Stagger between consecutive cards. At 1.4 the outgoing card's hold ends
// exactly as the incoming card's begins, and each card rises into view while
// its predecessor is still parked — so there is always one card settled to
// read and one arriving, never four in transit at once.
const STEP = 1.4

// Viewport heights of scrolling per unit. The dial for overall pace: the pin
// runs ((n − 1) × STEP + SPAN) × UNIT_VH, so at four cards this is ~3.96
// screens, of which each card spends ~0.77 stationary.
const UNIT_VH = 55

// Bounded float, applied only while a card is travelling — it peaks mid-rise
// and mid-exit and is exactly zero at both the start and the dwell. A card
// that wobbles while parked is a card you are still trying to read.
const DRIFT_PX = 26

// Fraction of the rise spent fading in — a card emerges over its first third
// rather than hard-clipping at the bottom edge.
const FADE_IN = 0.35

// The fade out spans the whole exit, so a card begins dissolving the moment it
// leaves the dwell instead of staying solid and then vanishing near the top.
// Eased rather than linear (see fadeOutEase) so it lingers through the early
// part of the exit — a straight ramp reads as translucent while the card is
// still well inside the frame.
const FADE_OUT = 1

function cardVars(i: number) {
  return { '--exp-x': `${LANES[i].x}%` }
}

const sectionRef = ref<HTMLElement | null>(null)
const stageRef = ref<HTMLElement | null>(null)

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

let mm: ReturnType<typeof gsap.matchMedia> | null = null

onMounted(() => {
  useReveal(sectionRef.value)

  mm = gsap.matchMedia()

  // Must stay in step with the two media queries in <style> — the pin, the
  // transforms, and the layout all switch at the same line.
  mm.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', () => {
    const cards = Array.from(stageRef.value?.querySelectorAll<HTMLElement>('.exp-card') ?? [])
    if (!cards.length) return

    // quickSetters skip GSAP's per-call property parsing. These run on every
    // scroll frame, so that overhead is the difference between a clean scrub
    // and a stuttering one.
    const setters = cards.map((card) => ({
      y: gsap.quickSetter(card, 'y', 'px'),
      fade: gsap.quickSetter(card, 'opacity')
    }))

    const state = { p: 0 }

    // Decelerating into the dwell is what makes the stop read as a landing
    // rather than as the animation stalling.
    const riseEase = gsap.parseEase('power2.out')

    // Leaving is sine rather than power2: both start from zero velocity, so
    // the handoff out of the hold is smooth either way, but cubic-in finishes
    // at 3× its average speed and the card visibly snaps away at the end.
    // sine.in tops out at ~1.57×, which reads as an even glide.
    const exitEase = gsap.parseEase('sine.in')

    // Applied to the remaining fraction of the exit, so opacity falls off
    // gently at first and steepens later.
    const fadeOutEase = gsap.parseEase('power1.out')

    const totalUnits = (cards.length - 1) * STEP + SPAN

    // Geometry is vh-derived, so it is measured against the live viewport on
    // every refresh rather than captured once at load. Card height is read
    // from the DOM rather than assumed from the CSS clamp.
    let startY = 0
    let dwells: number[] = []
    let exits: number[] = []

    const measure = () => {
      const vh = window.innerHeight
      startY = vh
      dwells = cards.map((card, i) => (vh - card.offsetHeight) / 2 + LANES[i].dwell)
      exits = cards.map((card) => -card.offsetHeight)
    }

    // Every card's position is a pure function of p, so scrubbing backwards
    // and parking mid-travel both fall out for free.
    const apply = () => {
      const u = state.p * totalUnits

      for (let i = 0; i < cards.length; i++) {
        // Each card's own clock, offset by the stagger. Negative means it has
        // not started; past SPAN means it has finished.
        const local = u - i * STEP
        const dwell = dwells[i]
        const exit = exits[i]

        let y: number
        let float = 0

        if (local <= 0) {
          y = startY
        } else if (local < RISE) {
          const k = local / RISE
          y = startY + (dwell - startY) * riseEase(k)
          float = LANES[i].drift * Math.sin(k * Math.PI) * DRIFT_PX
        } else if (local < RISE + HOLD) {
          // The hold. Nothing is written but the resting position, so the card
          // is genuinely stationary for this stretch of scroll — not merely
          // slow.
          y = dwell
        } else if (local < SPAN) {
          const k = (local - RISE - HOLD) / EXIT
          y = dwell + (exit - dwell) * exitEase(k)
          float = LANES[i].drift * Math.sin(k * Math.PI) * DRIFT_PX
        } else {
          y = exit
        }

        setters[i].y(y + float)
        setters[i].fade(
          local <= 0
            ? 0
            : gsap.utils.clamp(0, 1, local / (RISE * FADE_IN)) *
              fadeOutEase(gsap.utils.clamp(0, 1, (SPAN - local) / (EXIT * FADE_OUT)))
        )
      }
    }

    measure()
    apply()

    gsap.timeline({
      scrollTrigger: {
        trigger: sectionRef.value,
        start: 'top top',
        end: () => `+=${(UNIT_VH / 100) * window.innerHeight * totalUnits}`,
        pin: true,
        pinSpacing: true,
        scrub: 0.8,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        // A resize changes vh, which changes every term above. Re-measure and
        // re-apply at the current p rather than waiting for the next scroll
        // frame, which would leave cards in the old geometry until the user
        // moves.
        onRefresh: () => {
          measure()
          apply()
        }
      }
    }).to(state, { p: 1, ease: 'none', onUpdate: apply })

    // Runs when the query stops matching — a resize past lg, or the OS motion
    // setting flipping. gsap.matchMedia reverts the timeline and the pin
    // itself; this only clears what was written by hand.
    return () => {
      gsap.set(cards, { clearProps: 'all' })
    }
  })
})

onBeforeUnmount(() => {
  mm?.revert()
})
</script>

<template>
  <section id="experience" ref="sectionRef" class="exp-section">
    <div ref="stageRef" class="exp-stage">
      <div class="exp-title">
        <span class="exp-eyebrow">02 — Career</span>
        <h2 class="exp-word">Experience</h2>
      </div>

      <article v-for="(item, i) in items" :key="item.years" class="exp-card" :style="cardVars(i)">
        <h3 class="exp-role"><span class="exp-index">{{ pad(i + 1) }} —</span> {{ item.role }}</h3>

        <div>
          <p class="exp-meta">
            <span v-if="item.current" class="exp-dot" aria-hidden="true" />
            {{ item.org }} · {{ item.period }}
          </p>
          <p class="exp-summary">{{ item.summary }}</p>

          <!-- The floating card drops the bullets, which are this section's
               substance. So they stay in the markup always and the motion path
               hides them under an sr-only clip rather than display:none — see
               the lg media query. Below lg this is simply the visible body. -->
          <div class="exp-detail">
            <p class="exp-detail-head">{{ item.company }}</p>
            <p class="exp-detail-years">{{ item.years }}</p>
            <ul>
              <li v-for="bullet in item.bullets" :key="bullet" class="exp-bullet">{{ bullet }}</li>
            </ul>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
/*
  Task 2 adds the motion-path media query above this one. The two queries must
  stay exhaustive and mutually exclusive, and must match the gsap.matchMedia
  query in <script> exactly.
*/

.exp-section {
  background: theme('colors.paper-soft');
  padding: 6rem 0;
}

.exp-stage {
  max-width: 1240px;
  margin: 0 auto;
  padding: 0 1.25rem;
}

.exp-eyebrow {
  display: block;
  margin-bottom: 0.875rem;
  font-family: theme('fontFamily.data');
  font-size: 13px;
  letter-spacing: 0.02em;
  color: theme('colors.accent-text');
}

.exp-word {
  font-family: theme('fontFamily.display');
  font-size: clamp(30px, 4.5vw, 58px);
  font-weight: 900;
  line-height: 1;
  letter-spacing: -0.02em;
  text-transform: uppercase;
}

.exp-card {
  border-radius: 18px;
  margin-top: 3rem;
}

.exp-role {
  font-family: theme('fontFamily.display');
  font-size: clamp(19px, 1.55vw, 26px);
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.015em;
}

.exp-index {
  color: theme('colors.steel');
}

.exp-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.75rem;
  font-family: theme('fontFamily.data');
  font-size: 12px;
  color: theme('colors.steel');
}

.exp-dot {
  height: 6px;
  width: 6px;
  flex-shrink: 0;
  border-radius: 9999px;
  background: theme('colors.accent');
}

.exp-summary {
  margin-top: 0.5rem;
  font-size: 14px;
  line-height: 1.6;
  color: theme('colors.steel');
}

.exp-detail-head {
  font-family: theme('fontFamily.data');
  font-size: 13px;
  line-height: 1.6;
  color: theme('colors.steel');
}

.exp-detail-years {
  margin-top: 0.25rem;
  font-family: theme('fontFamily.data');
  font-size: 12px;
  color: theme('colors.steel');
}

.exp-bullet {
  position: relative;
  margin-bottom: 0.625rem;
  padding-left: 1.25rem;
  font-size: 14px;
  line-height: 1.6;
  color: theme('colors.steel');
}

.exp-bullet:last-child {
  margin-bottom: 0;
}

.exp-bullet::before {
  content: '—';
  position: absolute;
  left: 0;
  color: theme('colors.hair');
}

/* Motion path. Must match the gsap.matchMedia query in <script> exactly, and
   must stay mutually exclusive with the static query below. */
@media (min-width: 1024px) and (prefers-reduced-motion: no-preference) {
  .exp-section {
    padding: 0;
  }

  /* Full-bleed: the lanes are percentages of viewport width, as in the
     reference where card 01 starts ~7% from the page edge. overflow:hidden is
     what clips cards at the top and bottom of the pinned frame. */
  .exp-stage {
    position: relative;
    height: 100vh;
    max-width: none;
    margin: 0;
    padding: 0;
    overflow: hidden;
  }

  /* Sits still and centred while cards travel past it. z-index 0 against the
     cards' 10, so they occlude the word — per screenshot 2. */
  .exp-title {
    position: absolute;
    inset: 0;
    z-index: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    pointer-events: none;
  }

  .exp-word {
    font-size: clamp(44px, 10.5vw, 150px);
  }

  /* ~25vw × ~54vh is what a card measures in the reference. */
  .exp-card {
    position: absolute;
    z-index: 10;
    top: 0;
    left: var(--exp-x);
    width: clamp(260px, 25vw, 420px);
    height: clamp(320px, 54vh, 520px);
    margin-top: 0;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 1.75rem;
    /* Light falling from the top-left. Angled rather than vertical so the ramp
       runs across the card's diagonal and reads as a lit surface instead of a
       banded one. */
    background: linear-gradient(158deg, #ece9e0 0%, #e2ded4 52%, #d9d4c8 100%);
    /* Pre-hydration state, matching what apply() writes at p = 0 — every card
       parked just below the fold — so the first GSAP tick is not a visible
       jump. Without it all four render stacked on the heading for a frame. */
    transform: translateY(100vh);
    opacity: 0;
    will-change: transform, opacity;
  }

  /* The darker surface needs darker body text. `steel` (#6B6F76) sits at
     4.4:1 on the old flat #F2F0EB — already marginal for 14px — and drops to
     3.4:1 against this gradient's dark end, well under the 4.5:1 AA needs.
     These hold ~5.7:1 at the darkest stop. Scoped to the motion path because
     the static list has no card surface and keeps `steel` on paper. */
  .exp-meta,
  .exp-summary {
    color: #4a4e55;
  }

  /* Kept a step lighter than the role it prefixes — it is a label, not the
     heading. Large-bold at this size, so 3:1 is the bar; this clears 4.5:1. */
  .exp-index {
    color: #585c64;
  }

  /* Bullets are dropped from the visible card but kept in the accessibility
     tree and the crawled HTML. sr-only clip, deliberately not display:none. */
  .exp-detail {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
  }
}

/* Static path: plain vertical list. Also the reduced-motion answer at any
   width, which is why these unwind rather than only applying below lg. */
@media (max-width: 1023px), (prefers-reduced-motion: reduce) {
  /* Both of these are condensations for the floating card, and .exp-detail
     states the same things in full right below them. Redundant here. */
  .exp-meta,
  .exp-summary {
    display: none;
  }

  .exp-card + .exp-card {
    border-top: 1px solid theme('colors.hair');
    padding-top: 2rem;
  }

  .exp-detail {
    margin-top: 1.125rem;
    max-width: 760px;
  }

  .exp-detail ul {
    margin-top: 0.875rem;
    list-style: none;
  }
}
</style>
