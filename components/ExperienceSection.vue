<script setup lang="ts">
import { gsap } from 'gsap'
import { useReveal } from '~/composables/useReveal'
import { registerPerch } from '~/composables/useScrollBall'
import { cardTint } from '~/composables/useCardTints'
import { useSwipeRail } from '~/composables/useSwipeRail'

interface ExperienceItem {
  /** Full range with months — the static list. */
  years: string
  /** Condensed range for the card. */
  period: string
  role: string
  /** Full name with location — the static list. */
  company: string
  /** Short name; the full string is far too long for a card's meta line. */
  org: string
  /** One sentence distilled from the first bullet — the card's body. */
  summary: string
  /** 'YYYY-MM', inclusive. Places the bar's left edge on the time axis. */
  start: string
  /** 'YYYY-MM', inclusive. Places the bar's right edge. */
  end: string
  current?: boolean
  bullets: string[]
}

// Oldest first. The chart reads top-left → bottom-right, so time has to flow
// down as well as right — that diagonal is the staircase the ball rolls down.
const items: ExperienceItem[] = [
  {
    years: 'Mar 2014 — Jul 2016',
    period: '2014 — 2016',
    role: 'UI Developer',
    company: 'GL Infotech, Thrissur, Kerala, India',
    org: 'GL Infotech',
    summary: 'Started out building UI components and web pages in HTML, CSS, and JavaScript.',
    start: '2014-03',
    end: '2016-07',
    bullets: [
      'Started career building UI components and static/dynamic web pages — a foundation in HTML, CSS, and JavaScript.'
    ]
  },
  {
    years: 'Aug 2016 — Dec 2016',
    period: '2016',
    role: 'UI/UX Developer',
    company: 'Tecrizon, Infopark, Kochi, Kerala, India',
    org: 'Tecrizon',
    summary: 'Designed and built UI and UX flows for web client projects.',
    start: '2016-08',
    end: '2016-12',
    bullets: [
      'Designed and implemented UI and UX flows for web-based client projects, including wireframing and front-end build phases.'
    ]
  },
  {
    years: 'Mar 2017 — Jun 2020',
    period: '2017 — 2020',
    role: 'Frontend Developer',
    company: 'Golden Star Media Production & Event Management, Dubai, UAE',
    org: 'Golden Star Media',
    summary: 'Built React and Vue applications with Redux-backed shared state.',
    start: '2017-03',
    end: '2020-06',
    bullets: [
      'Built web applications in React.js and Vue.js, using Redux for shared state across greenfield builds and iterative feature work.',
      'Developed responsive interfaces with Vue Material, Ionic 4, and SASS for cross-device consistency.'
    ]
  },
  {
    years: 'Aug 2020 — Present',
    period: '2020 — NOW',
    role: 'Senior Frontend / UI Developer',
    company: 'Alternative Agency, Dubai, UAE',
    org: 'Alternative Agency',
    summary: 'Lead frontend for automotive CMS platforms across 8+ regional markets.',
    start: '2020-08',
    end: '2026-08',
    current: true,
    bullets: [
      'Lead frontend development for automotive CMS platforms across 8+ regional markets, including the Vue.js component library used across the Nissan and Ford sites.',
      'Architect interactive showroom tools and configurators, translating Figma designs into production builds with GSAP and WebGL.',
      'Build multilingual Arabic/English site variants with RTL-aware layouts for KSA, UAE, and North Africa rollouts.',
      'Integrate third-party systems — auth, payments, mapping, CRM — working directly with backend teams on API contracts.'
    ]
  }
]

/* ---------------------------------------------------------------- time axis */

function monthIndex(ym: string): number {
  const [y, m] = ym.split('-').map(Number)
  return y * 12 + (m - 1)
}

// Fixed rather than derived from `new Date()`: the axis is rendered during SSR
// and again on hydration, and a live clock is the classic way to make those two
// disagree. Bump this (and the current role's `end`) when the CV is updated.
const AXIS_START = monthIndex('2014-01')
const AXIS_END = monthIndex('2026-12')
const AXIS_SPAN = AXIS_END - AXIS_START

/** Position on the axis, 0–100, as a straight linear map of elapsed months. */
function axisPct(ym: string): number {
  return ((monthIndex(ym) - AXIS_START) / AXIS_SPAN) * 100
}

// Labels are decorative; the same dates are stated in words inside every card.
const TICK_AT = ['2014-01', '2016-01', '2018-01', '2020-01', '2022-01', '2024-01', '2026-08']

const ticks = TICK_AT.map((at, i) => ({
  label: at === '2026-08' ? 'NOW' : at.slice(0, 4),
  left: `${axisPct(at)}%`,
  // The stretch of time this label stands for — up to the next label, or open
  // ended for NOW. A role lights a label when it overlaps that stretch, not
  // when it happens to contain the label's exact month: on the latter rule
  // 2014 never lights at all (the first job starts in March) and Tecrizon's
  // four months light nothing.
  from: monthIndex(at),
  to: i + 1 < TICK_AT.length ? monthIndex(TICK_AT[i + 1]) : Infinity
}))

// Which labels each role lights, worked out once. Row per role, column per
// tick — read every frame, so it must not be a search.
const tickCover = items.map((item) => {
  const a = monthIndex(item.start)
  const b = monthIndex(item.end)
  return ticks.map((t) => a < t.to && b >= t.from)
})

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/* ------------------------------------------------------------------ layout */

// Collapsed bar height, and the gap between rows. The ball is roughly 2.5× the
// bar height, which is the proportion the reference chart uses.
const BAR_H = 14
const ROW_GAP = 22

// A card has to be wide enough to carry a role, a meta line and a sentence.
// Bars narrower than this (Tecrizon's four months is a 31px nub at 1200px of
// track) grow rightward to reach it when they open — the *collapsed* bar keeps
// its true proportional width, so the chart at rest stays honest.
const CARD_MIN_W = 300

// Horizontal travel of a single fall, and how far into a card the ball lands.
//
// Sized so the hop covers the distance the ball would travel anyway at the
// pace it rolls: FALL_U of this timeline works out at ~128px of scroll, and
// ~0.44px of travel per px of scroll over that is ~132px. Set it shorter and the
// ball has to brake in mid-air to avoid overshooting the next card, which is
// the velocity step you feel at every handoff between cards. Re-derive it if
// FALL_U or UNIT_VH move — it is a consequence of them, not a free choice.
const FALL_DX = 132
const LAND_INSET = 28

// Shortest roll worth animating. Cards extend their open width if needed to
// guarantee it, which is what keeps the ball's x monotonic without distorting
// the bar geometry — see the forward pass in measure().
const MIN_ROLL = 150

/* ------------------------------------------------------------------ motion */

// Everything below is measured in abstract units that UNIT_VH turns into real
// scrolling, the same shape as the float-deck variant: one scalar `p` scrubs
// the pin, and every position is a pure function of it. Scrubbing backwards
// and parking mid-fall therefore both fall out for free.
const LEAD_IN_U = 0.42
const LEAD_OUT_U = 0.48
// Held equal to OPEN_U and CLOSE_U below, and that is not a coincidence: the
// card being left closes over CLOSE_U from the moment the ball leaves it, and
// the card being joined opens over OPEN_U ending as the ball lands. The three
// only cancel — one card's height going as the next one's arrives, so the
// stack does not pump up and down at every handoff — while all three match.
const FALL_U = 0.8

// The open ramp runs during the fall *toward* a card, so it is already at full
// height when the ball lands on it — the ball rides the card's top edge, so it
// cannot be arriving at a surface that is still growing. The close ramp runs
// during the fall away, and the two overlap, so total chart height stays
// near-constant through the handoff instead of pumping.
// One unit is UNIT_VH percent of a viewport whatever else changes, so these
// are ~300px of scroll at 900px tall, against the 113px they started at.
//
// They cannot exceed FALL_U, and that is why it moved with them: a card has to
// hold its full size for the whole time the ball is rolling along it, so the
// only room the ramps have is the hop between one card and the next.
const OPEN_U = 0.8
const CLOSE_U = 0.8

// Roll duration is proportional to distance, so the ball holds a roughly even
// speed across cards of very different widths. Clamped at both ends: without
// the floor a short card would flash past, without the ceiling the six-year
// bar would stall.
const ROLL_MIN_U = 0.75
const ROLL_MAX_U = 2

// Viewport heights of scrolling per unit — the dial for overall pace. At four
// roles this comes to ~2.7 screens of pin.
const UNIT_VH = 42

const sectionRef = ref<HTMLElement | null>(null)
const stageRef = ref<HTMLElement | null>(null)
const chartRef = ref<HTMLElement | null>(null)

// Below lg the chart is a swipe rail. The same element serves both: above lg
// it is the positioned track the rows are measured and transformed inside,
// below it `.swipe-rail` makes it the scroll container and the rows revert to
// ordinary flex items. The two never run at once — the matchMedia block below
// and RAIL_QUERY are the same line — so neither can find the other's geometry
// on the element.
const { active, isRail, goTo } = useSwipeRail(() => chartRef.value, '.gantt-row')

let mm: ReturnType<typeof gsap.matchMedia> | null = null

onMounted(() => {
  useReveal(sectionRef.value)

  mm = gsap.matchMedia()

  // Must stay in step with the two media queries in <style> — the pin, the
  // chart, and the static list all switch at the same line. It is also
  // deliberately the same line as BALL_QUERY: the perches registered below are
  // only useful while the page's ball is running, and the chart is only worth
  // pinning while it has a ball to ride it.
  mm.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', () => {
    const chart = chartRef.value
    const rows = Array.from(chart?.querySelectorAll<HTMLElement>('.gantt-row') ?? [])
    const tickEls = Array.from(stageRef.value?.querySelectorAll<HTMLElement>('.gantt-tick') ?? [])
    if (!chart || rows.length !== items.length) return

    // sine, not power2. Both start and end at rest, so either looks right in a
    // still frame — but power2.inOut is cubic, and a cubic in-out puts 87% of
    // its change inside the middle half of the ramp, peaking at 3× its average
    // rate. That is the snap: however long the ramp, the card still does
    // almost all of its growing in a moment. sine.inOut peaks at 1.57×, so the
    // growth is spread across the whole ramp instead of concentrated in it.
    const easeOpen = gsap.parseEase('sine.inOut')
    const clamp01 = gsap.utils.clamp(0, 1)
    const lerp = (a: number, b: number, k: number) => a + (b - a) * k

    let cardH = 0
    let chartH = 0
    let track = 0
    let bars: { left: number; width: number }[] = []
    let cards: { left: number; width: number; landing: number; right: number }[] = []
    let opens: { start: number; end: number }[] = []
    let totalU = 1

    const measure = () => {
      track = chart.clientWidth

      // True proportional geometry. This is what the collapsed chart shows.
      bars = items.map((item) => {
        const left = (axisPct(item.start) / 100) * track
        const right = (axisPct(item.end) / 100) * track
        return { left, width: Math.max(right - left, 10) }
      })

      // Forward pass. Each card's landing point is derived from where the
      // previous card *ends when open*, so the ball's x only ever increases —
      // no assumption that the bars happen to line up. Where that would leave
      // too little to roll across, the card's open width grows to cover it.
      const cardMin = Math.min(CARD_MIN_W, track * 0.34)
      cards = []
      let prevRight = -Infinity
      for (let i = 0; i < items.length; i++) {
        const bar = bars[i]
        const landing = Math.max(prevRight + FALL_DX, bar.left + LAND_INSET)
        const right = Math.min(
          Math.max(bar.left + bar.width, landing + MIN_ROLL, bar.left + cardMin),
          track
        )
        cards.push({
          left: bar.left,
          width: right - bar.left,
          landing: Math.min(landing, right - 24),
          right
        })
        prevRight = right
      }

      // Card height is measured, not assumed: each card is laid out at its own
      // open width and the tallest wins. A hard-coded height either clips a
      // role that wraps to two lines on a narrow card, or leaves dead space
      // under every card that doesn't. One forced reflow per refresh, not per
      // frame.
      let tallest = 0
      for (let i = 0; i < rows.length; i++) {
        rows[i].style.width = `${cards[i].width}px`
        rows[i].style.height = 'auto'
        tallest = Math.max(tallest, (rows[i].firstElementChild as HTMLElement).offsetHeight)
      }
      cardH = Math.min(Math.max(tallest, 150), window.innerHeight * 0.42)
      chartH = cardH + (items.length - 1) * (BAR_H + ROW_GAP)
      chart.style.height = `${chartH}px`

      // Roll duration ∝ roll distance, normalised so the mean card runs at
      // about one unit.
      const dists = cards.map((c) => Math.max(24, c.right - c.landing))
      const mean = dists.reduce((a, b) => a + b, 0) / dists.length
      const rollU = dists.map((d) =>
        gsap.utils.clamp(ROLL_MIN_U, ROLL_MAX_U, (d / mean) * 1.1)
      )

      // Lay the timeline out. The gaps are as load-bearing as the rolls: the
      // lead-in is the stretch of pin during which the page's ball is still
      // falling in from the work deck, each FALL_U is its hop between cards,
      // and the lead-out is the room it needs to leave for the skills rail.
      opens = []
      let u = LEAD_IN_U
      for (let i = 0; i < items.length; i++) {
        const end = u + rollU[i]
        opens.push({ start: u, end })
        u = end + (i < items.length - 1 ? FALL_U : 0)
      }
      totalU = u + LEAD_OUT_U
    }

    const state = { p: 0 }

    // Rewritten each frame rather than allocated — this runs on every scroll
    // tick.
    const heights = new Array<number>(items.length).fill(0)
    const tops = new Array<number>(items.length).fill(0)
    const opened = new Array<number>(items.length).fill(0)

    // Expansion, and the row stack that falls out of it. The ball is no longer
    // this section's business — it belongs to the page, and rides whatever
    // surface this produces. See TheScrollBall.vue.
    const apply = () => {
      const u = state.p * totalU

      let top = 0
      for (let i = 0; i < items.length; i++) {
        const { start, end } = opens[i]
        const rising = easeOpen(clamp01((u - (start - OPEN_U)) / OPEN_U))
        const closed = easeOpen(clamp01((u - end) / CLOSE_U))
        const e = rising * (1 - closed)
        opened[i] = e

        heights[i] = BAR_H + e * (cardH - BAR_H)
        tops[i] = top
        top += heights[i] + ROW_GAP

        const card = cards[i]
        const row = rows[i]
        row.style.width = `${lerp(bars[i].width, card.width, e)}px`
        row.style.height = `${heights[i]}px`
        row.style.transform = `translate3d(${card.left}px, ${tops[i]}px, 0)`
        row.style.setProperty('--e', e.toFixed(4))
      }

      // The ruler answers the chart: each label lights to whatever extent the
      // role that spans it is open, so the years read as the card's own dates
      // rather than as a fixed scale it happens to sit on. Written straight to
      // the element for the same reason the rows are — this runs every frame,
      // and a reactive binding here would re-render the ruler on each one.
      for (let t = 0; t < tickEls.length; t++) {
        let on = 0
        for (let i = 0; i < items.length; i++) {
          if (tickCover[i][t] && opened[i] > on) on = opened[i]
        }
        tickEls[t].style.setProperty('--on', on.toFixed(3))
      }
    }

    measure()
    apply()
    gsap.set(chart, { opacity: 1 })

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: sectionRef.value,
        start: 'top top',
        end: () => `+=${(UNIT_VH / 100) * window.innerHeight * totalU}`,
        pin: true,
        pinSpacing: true,
        scrub: 0.8,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        // A resize changes the track width and every px term derived from it.
        // Re-measure and re-apply at the current p rather than waiting for the
        // next scroll frame, which would leave the chart in the old geometry
        // until the user moves.
        onRefresh: () => {
          measure()
          apply()
        }
      }
    }).to(state, { p: 1, ease: 'none', onUpdate: apply })

    // Each open card is a perch. Registered directly rather than through
    // useBallPerch because the windows have to be slices of *this* timeline —
    // a card is only ridable while it is open, and when that is depends on the
    // unit layout above, not on where the row sits in the viewport.
    const st = tl.scrollTrigger!
    const slice = (u: number) => st.start + (u / totalU) * (st.end - st.start)

    const offs = items.map((_item, i) =>
      registerPerch({
        surface: () => rows[i],
        range: () => [slice(opens[i].start), slice(opens[i].end)],
        // The forward pass already worked out where the ball can land without
        // travelling backwards; express it as a fraction of the open card so
        // the page's ball can resolve it against the live rect.
        from: () => (cards[i].landing - cards[i].left) / Math.max(1, cards[i].width),
        to: 1,
        // The card's width comes off this timeline's scrubbed `p`, so where the
        // ball sits along it has to come off the same `p` — not off a second,
        // differently-smoothed reading of the scrollbar. Two smoothings of one
        // scroll disagree, and the disagreement reverses sign when the page
        // does, which is what made the ball and the card slide apart on the way
        // back up. See `progress` in composables/useScrollBall.ts.
        progress: () => {
          const { start, end } = opens[i]
          return (state.p * totalU - start) / Math.max(1e-6, end - start)
        },
        // `landing` and `right` carry their own insets already.
        inset: 0
      })
    )

    // Runs when the query stops matching — a resize past lg, or the OS motion
    // setting flipping. gsap.matchMedia reverts the timeline and the pin
    // itself; this clears what was written by hand, which clearProps does not
    // cover because the row geometry is set through .style directly.
    return () => {
      for (const off of offs) off()
      for (const tick of tickEls) tick.style.removeProperty('--on')
      chart.style.height = ''
      for (const row of rows) {
        row.style.width = ''
        row.style.height = ''
        row.style.transform = ''
        row.style.removeProperty('--e')
      }
      gsap.set(chart, { clearProps: 'all' })
    }
  })
})

onBeforeUnmount(() => {
  mm?.revert()
})
</script>

<template>
  <section id="experience" ref="sectionRef" class="gantt-section">
    <div ref="stageRef" class="gantt-stage">
      <div class="gantt-frame">
        <header class="gantt-head reveal">
          <span class="gantt-eyebrow">02 — Career</span>
          <h2 class="gantt-title">Experience</h2>
        </header>

        <!-- Decorative: every date on it is also written out inside a card. -->
        <div class="gantt-ruler" aria-hidden="true">
          <span v-for="tick in ticks" :key="tick.label" class="gantt-tick" :style="{ left: tick.left }">
            <i />{{ tick.label }}
          </span>
        </div>

        <div
          ref="chartRef"
          class="gantt-chart swipe-rail"
          :role="isRail ? 'group' : undefined"
          :aria-roledescription="isRail ? 'carousel' : undefined"
          :aria-label="isRail ? 'Career history' : undefined"
          :tabindex="isRail ? 0 : undefined"
          @keydown.arrow-left.prevent="goTo(active - 1)"
          @keydown.arrow-right.prevent="goTo(active + 1)"
        >
          <article v-for="(item, i) in items" :key="item.org" class="gantt-row" :style="cardTint(i)">
            <div class="gantt-card">
              <h3 class="gantt-role"><span class="gantt-index">{{ pad(i + 1) }} —</span> {{ item.role }}</h3>

              <p class="gantt-meta">
                <span v-if="item.current" class="gantt-dot" aria-hidden="true" />
                {{ item.org }} · {{ item.period }}
              </p>
              <p class="gantt-summary">{{ item.summary }}</p>

              <!-- The card has no room for bullets, which are this section's
                   substance. So they stay in the markup always and each
                   presentation clips what it can't carry, sr-only rather than
                   display:none: the chart above lg hides this block whole, the
                   rail below it hides only the list and keeps the company and
                   the dates. The one path that shows everything is the static
                   list — what desktop reduced-motion gets, and what a phone
                   falls back to with no CSS at all. -->
              <div class="gantt-detail">
                <p class="gantt-detail-head">{{ item.company }}</p>
                <p class="gantt-detail-years">{{ item.years }}</p>
                <ul>
                  <li v-for="bullet in item.bullets" :key="bullet" class="gantt-bullet">{{ bullet }}</li>
                </ul>
              </div>

              <!-- Rail only. Bullet counts run one to four, so equal-height
                   cards leave the early roles most of a screen of bare tint;
                   this gives that space to the one thing the phone loses when
                   the ruler goes away. Decorative — .gantt-detail-years states
                   the same range in full, with months, right above it. -->
              <p class="gantt-period" aria-hidden="true">{{ item.period }}</p>
            </div>
          </article>
        </div>

        <!-- Rail position. Labelled by employer, which is what a listener is
             choosing between — "slide 2 of 4" names nothing. -->
        <div class="swipe-dots">
          <button
            v-for="(item, i) in items"
            :key="`dot-${item.org}`"
            type="button"
            class="swipe-dot"
            :aria-label="`Show ${item.role} at ${item.org}`"
            :aria-current="active === i ? 'true' : undefined"
            @click="goTo(i)"
          >
            <span />
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.gantt-section {
  background: theme('colors.paper-soft');
  padding: 6rem 0;
}

.gantt-stage {
  max-width: 1240px;
  margin: 0 auto;
  padding: 0 1.25rem;
}

.gantt-eyebrow {
  display: block;
  margin-bottom: 0.875rem;
  font-family: theme('fontFamily.data');
  font-size: 13px;
  letter-spacing: 0.02em;
  color: theme('colors.accent-text');
}

.gantt-title {
  font-family: theme('fontFamily.display');
  font-size: clamp(30px, 4.5vw, 58px);
  font-weight: 900;
  line-height: 1;
  letter-spacing: -0.02em;
  text-transform: uppercase;
}

.gantt-role {
  font-family: theme('fontFamily.display');
  font-size: clamp(18px, 1.5vw, 25px);
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.015em;
}

.gantt-index {
  color: theme('colors.steel');
}

.gantt-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.75rem;
  font-family: theme('fontFamily.data');
  font-size: 12px;
  color: theme('colors.steel');
}

.gantt-dot {
  height: 6px;
  width: 6px;
  flex-shrink: 0;
  border-radius: 9999px;
  background: theme('colors.accent');
}

.gantt-summary {
  margin-top: 0.5rem;
  font-size: 14px;
  line-height: 1.6;
  color: theme('colors.steel');
}

.gantt-detail-head {
  font-family: theme('fontFamily.data');
  font-size: 13px;
  line-height: 1.6;
  color: theme('colors.steel');
}

.gantt-detail-years {
  margin-top: 0.25rem;
  font-family: theme('fontFamily.data');
  font-size: 12px;
  color: theme('colors.steel');
}

.gantt-bullet {
  position: relative;
  margin-bottom: 0.625rem;
  padding-left: 1.25rem;
  font-size: 14px;
  line-height: 1.6;
  color: theme('colors.steel');
}

.gantt-bullet:last-child {
  margin-bottom: 0;
}

.gantt-bullet::before {
  content: '—';
  position: absolute;
  left: 0;
  color: theme('colors.hair');
}

/* A rail device. The chart carries the passage of time in its geometry and
   its ruler, and neither survives the phone — this is where that reading
   goes, sunk into the card's own tint rather than set on top of it. */
.gantt-period {
  display: none;
}

/* The chart. Must match the gsap.matchMedia query in <script> exactly, and
   must stay mutually exclusive with the static query below. */
@media (min-width: 1024px) and (prefers-reduced-motion: no-preference) {
  .gantt-section {
    padding: 0;
  }

  .gantt-stage {
    position: relative;
    display: flex;
    height: 100vh;
    align-items: center;
    padding: 0 clamp(1.25rem, 3.5vw, 3.5rem);
    overflow: hidden;
  }

  .gantt-frame {
    width: 100%;
  }

  .gantt-head {
    margin-bottom: clamp(2rem, 5vh, 3.5rem);
  }

  .gantt-ruler {
    position: relative;
    height: 34px;
  }

  .gantt-ruler::before {
    content: '';
    position: absolute;
    inset: 0 0 auto 0;
    border-top: 1px dashed #dcd9d1;
  }

  /* `--on` is written per frame by apply(): how open the role that spans this
     label currently is. Everything below is a plain interpolation on it, so
     the label tracks the card's growth exactly rather than switching at some
     threshold — no state, nothing to fall out of step. */
  .gantt-tick {
    position: absolute;
    top: 0;
    padding-top: 13px;
    transform: translateX(-50%);
    font-family: theme('fontFamily.data');
    font-size: 12px;
    white-space: nowrap;
    color: theme('colors.steel');
    color: color-mix(
      in srgb,
      theme('colors.steel'),
      theme('colors.accent-text') calc(var(--on, 0) * 100%)
    );
  }

  .gantt-tick i {
    position: absolute;
    top: -4px;
    left: 50%;
    width: 1px;
    height: calc(9px + var(--on, 0) * 6px);
    background: #cfcbc1;
    background: color-mix(in srgb, #cfcbc1, theme('colors.accent') calc(var(--on, 0) * 100%));
  }

  .gantt-chart {
    position: relative;
    /* The page's ball sits on top of row 0, so it overhangs the chart by its
       own diameter — plus its landing bounce again. Anything less and it
       crosses the ruler's labels on the first card. The reference leaves a
       comparable gap between its week ruler and the first bar. */
    margin-top: clamp(3.5rem, 7vh, 5rem);
    /* Height and every row's geometry come from measure(); until that runs
       the rows are unpositioned and would stack on the origin. Revealed by
       the first apply(). */
    opacity: 0;
  }

  .gantt-row {
    position: absolute;
    top: 0;
    left: 0;
    overflow: hidden;
    /* Confines the per-frame width/height writes below to each row's own
       subtree instead of letting them dirty the whole chart. */
    contain: layout paint;
    /* Opens to 22px, matching the skills cards. */
    border-radius: calc(7px + var(--e, 0) * 15px);
    /* Same tint pair the skills grid uses, on the same 105deg diagonal, so a
       bar and a skill card read as the same material. Full strength at every
       --e rather than fading up from grey: collapsed, these four bars *are*
       the chart, and a chart of near-white slivers has nothing to read. */
    background: linear-gradient(105deg, var(--tint) 0%, var(--tint-wash) 100%);
    box-shadow:
      0 22px 46px -30px rgba(18, 18, 18, calc(var(--e, 0) * 0.55)),
      inset 0 0 0 1px rgba(18, 18, 18, calc(var(--e, 0) * 0.05));
    will-change: transform, width, height;
  }

  .gantt-card {
    padding: 1.15rem 1.35rem;
    /* Lags the expansion, so text never sits half-visible across the thin
       part of the open ramp. */
    opacity: clamp(0, calc((var(--e, 0) - 0.4) * 2.8), 1);
  }

  /* The surface is a tint now, so body copy comes down off `steel` (#6B6F76),
     which lands at ~4.2:1 against the darker ones — under AA at 14px. The
     shared --card-ink holds 6.8:1 on the worst of the five. */
  .gantt-meta,
  .gantt-summary {
    color: var(--card-ink);
  }

  /* Kept a step lighter than the role it prefixes — it is a label, not the
     heading. Large-bold at this size, so 3:1 is the bar; this clears 5.6:1
     against the mint tint, the darkest of the five. */
  .gantt-index {
    color: #585c64;
  }

  /* Bullets are dropped from the visible card but kept in the accessibility
     tree and the crawled HTML. sr-only clip, deliberately not display:none. */
  .gantt-detail {
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
  .gantt-ruler {
    display: none;
  }

  /* Both of these are condensations for the card, and .gantt-detail states the
     same things in full right below them. Redundant here. */
  .gantt-meta,
  .gantt-summary {
    display: none;
  }

  .gantt-head {
    margin-bottom: 3rem;
  }

  .gantt-row + .gantt-row {
    border-top: 1px solid theme('colors.hair');
    margin-top: 2rem;
    padding-top: 2rem;
  }

  .gantt-detail {
    margin-top: 1.125rem;
    max-width: 760px;
  }

  .gantt-detail ul {
    margin-top: 0.875rem;
    list-style: none;
  }
}

/* The rail. Narrower than the block above on purpose: that one also answers
   reduced motion at desktop widths, where a horizontal rail is not what a
   1400px screen wants — there the section stays the plain list. Must stay in
   step with `.swipe-rail` in assets/css/main.css and with RAIL_QUERY in
   composables/useSwipeRail.ts. */
@media (max-width: 1023px) {
  .gantt-chart {
    /* Matches .gantt-stage's own 1.25rem padding. */
    --rail-gutter: 1.25rem;
  }

  /* The tint the chart has carried on desktop since it was built, finally on
     the phone too. Same gradient and angle as the bars and the skills cards,
     so a role reads as the same material wherever it is met. */
  .gantt-row {
    display: flex;
    border-radius: 22px;
    padding: 1.5rem 1.35rem;
    background: linear-gradient(105deg, var(--tint) 0%, var(--tint-wash) 100%);
    box-shadow:
      0 18px 40px -28px rgba(18, 18, 18, 0.5),
      inset 0 0 0 1px rgba(18, 18, 18, 0.05);
  }

  /* Fills the row the rail stretched it to, so the period below can find the
     card's floor rather than sitting under the last body copy. */
  .gantt-card {
    display: flex;
    flex: 1;
    flex-direction: column;
  }

  /* The one-sentence summary becomes the card's body, in place of the bullet
     list. That list is what made this card tall — four bullets on the current
     role, each running three or four lines at a phone's measure, and every
     card stretched to that one. `summary` was written to be exactly this, and
     it is what the chart's cards show above lg.

     It is hidden by the static-list block above, which also answers reduced
     motion at desktop widths; that path keeps the full bullets and is
     deliberately left alone. This only re-shows it for the rail. The meta line
     stays hidden there — .gantt-detail-head names the same employer in full
     two lines further down. */
  .gantt-summary {
    display: block;
  }

  /* The company and the month-precise range stay on the card: dropping them
     with the bullets left it too short to read as a card at all. Only the list
     itself goes, and it goes under an sr-only clip rather than display:none —
     the same device the chart uses above lg — so nothing leaves the
     accessibility tree or the crawled HTML. */
  .gantt-detail {
    margin-top: 0.875rem;
  }

  .gantt-detail ul {
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

  /* `steel` measures ~4.2:1 on the darker tints, under AA at these sizes.
     --card-ink holds 8:1 on all five. Same reasoning as the lg block. */
  .gantt-summary,
  .gantt-detail-head,
  .gantt-detail-years {
    color: var(--card-ink);
  }

  /* Scaled with the card. At the old 44px it was a quarter of the height a
     shortened card has to spend, which is a lot for a decoration. */
  .gantt-period {
    display: block;
    margin-top: auto;
    padding-top: 1.25rem;
    font-family: theme('fontFamily.display');
    font-size: clamp(28px, 8vw, 38px);
    font-weight: 900;
    line-height: 1;
    letter-spacing: -0.02em;
    /* Sunk into the tint rather than printed on it. Deliberately below the
       contrast floor for text, which is why it is aria-hidden — the range a
       screen reader gets is .gantt-detail-years, in full and with months,
       from the block above. */
    color: rgba(18, 18, 18, 0.14);
  }

  /* The list's separators are what the card replaces. */
  .gantt-row + .gantt-row {
    border-top: 0;
    margin-top: 0;
    padding-top: 1.5rem;
  }

  /* Large-bold at this size, so 3:1 is the bar; this clears 5.6:1 on the mint,
     the darkest of the five. */
  .gantt-index {
    color: #585c64;
  }
}
</style>
