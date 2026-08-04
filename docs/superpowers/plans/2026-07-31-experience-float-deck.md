# Experience Float Deck Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 3D flip carousel in `components/ExperienceSection.vue` with a pinned stage where flat cards float up from below the fold, one at a time, past a giant centred heading.

**Architecture:** One `<section>` pinned by GSAP ScrollTrigger. A single scrubbed scalar `p: 0 → 1` drives every card's `y` and `opacity` as a pure function, written through `gsap.quickSetter`. Cards are absolutely positioned in fixed horizontal lanes at staggered vertical offsets; the shared `−p × TRAVEL` term is the rise, and a bounded per-card `sin` bump is the float. Below `lg`, or under reduced motion, none of that exists — the same markup falls back to a plain vertical list.

**Tech Stack:** Nuxt 3, Vue 3 `<script setup lang="ts">`, GSAP 3 (`gsap.matchMedia` + ScrollTrigger), Tailwind (`@nuxtjs/tailwindcss`) with scoped CSS for everything Tailwind has no utility for.

**Spec:** `docs/superpowers/specs/2026-07-31-experience-float-deck-design.md`

## Global Constraints

- **Single file.** Only `components/ExperienceSection.vue` changes. `components/ExperienceSection-3d.vue` is the user's backup — do not touch, do not delete.
- **No new dependencies.** Do not add anything to `package.json`. GSAP and ScrollTrigger are already present; ScrollTrigger is registered globally in `plugins/` (see `composables/useReveal.ts`, which imports it directly).
- **The two media queries must stay exhaustive and mutually exclusive**, and must exactly match the `gsap.matchMedia` query string:
  - motion path: `(min-width: 1024px) and (prefers-reduced-motion: no-preference)`
  - static path: `(max-width: 1023px), (prefers-reduced-motion: reduce)`
  A gap between them leaves absolutely-positioned cards with nothing driving their transform, stacking all four on the heading.
- **Card radius is `18px`** — matches the site's existing card language (`work-card` is `rounded-[20px]`). The reference's square corners are deliberately not adopted.
- **No progress rail, no counter, no `aria-live` region, no `activeIndex`.** This is not a slider; there is no current item.
- **Card surface is `#F2F0EB`**, flat — no shadow, no ring.
- **All four cards stay in the accessibility tree at all times.** Nothing is ever `aria-hidden`.
- **Tailwind colour tokens:** `ink #121212`, `paper #FFFFFF`, `paper-soft #FAFAF8`, `accent #FF4A1F`, `accent-text #CC3D10`, `steel #6B6F76`, `hair #E7E5DF`. Fonts: `font-display` (Archivo), `font-body` (Inter), `font-data` (IBM Plex Mono).

## Verification Setup (read before Task 1)

This project has **no test runner**. Verification is two layers:

**Layer 1 — required on every task.** The production build must succeed:

```bash
cd "d:/.lib/withLatx/shejin-portfolio" && npm run build
```

This compiles every SFC, so it catches template syntax errors, unresolved
refs, and TS errors inside `<script setup>`. It does *not* run `vue-tsc`
(not installed), so it will not catch every type mismatch.

**Layer 2 — behavioural.** Tasks 2, 3 and 4 assert real geometry. Two ways
to run them; pick one at the start and stay with it.

**Option A — Node Playwright (recommended, automated).** One-time setup that
does *not* modify `package.json`:

```bash
npx --yes playwright@1.49.1 install chromium
```

That downloads ~150MB of browser into the npx/Playwright cache. Every check
script in this plan then runs as:

```bash
cd "d:/.lib/withLatx/shejin-portfolio" && npm run dev
# in a second shell, once it prints the local URL (default http://localhost:3000):
npx --yes playwright@1.49.1 --version >/dev/null && node <script-path>
```

Scripts go in the scratchpad, not the repo:
`C:\Users\alter\AppData\Local\Temp\claude\D---lib-withLatx-shejin-portfolio\766bb55e-9b63-4abe-86c9-c230c5b824f2\scratchpad\`

**Option B — manual.** Run `npm run dev`, open `http://localhost:3000`, and
follow the "Manual fallback" block spelled out in each task. Slower, and
the numeric assertions become eyeball judgements.

---

### Task 1: Data model, markup, and the static path

Rewrite the component so it renders as a correct, complete vertical list at
every viewport width. No stage, no pin, no GSAP beyond the existing
`useReveal`. This is the fallback path and the SSR/no-JS output, so it is
built first and stands on its own.

**Files:**
- Modify: `components/ExperienceSection.vue` (full rewrite, 511 lines → ~180)

**Interfaces:**
- Consumes: `useReveal(root: HTMLElement | null)` from `~/composables/useReveal`.
- Produces, for Tasks 2–4:
  - `sectionRef: Ref<HTMLElement | null>` — the ScrollTrigger trigger.
  - `stageRef: Ref<HTMLElement | null>` — queried for `.exp-card`.
  - CSS class contract: `.exp-stage`, `.exp-title`, `.exp-eyebrow`, `.exp-word`, `.exp-card`, `.exp-role`, `.exp-index`, `.exp-meta`, `.exp-dot`, `.exp-summary`, `.exp-detail`.
  - Per-card inline custom properties `--exp-x` and `--exp-top`, set in Task 2.

- [ ] **Step 1: Write the whole file**

Replace the entire contents of `components/ExperienceSection.vue` with:

```vue
<script setup lang="ts">
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

const sectionRef = ref<HTMLElement | null>(null)
const stageRef = ref<HTMLElement | null>(null)

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

onMounted(() => {
  useReveal(sectionRef.value)
})
</script>

<template>
  <section id="experience" ref="sectionRef" class="exp-section">
    <div ref="stageRef" class="exp-stage">
      <div class="exp-title">
        <span class="exp-eyebrow">02 — Career</span>
        <h2 class="exp-word">Experience</h2>
      </div>

      <article v-for="(item, i) in items" :key="item.years" class="exp-card">
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

/* Static path: plain vertical list. Also the reduced-motion answer at any
   width, which is why these unwind rather than only applying below lg. */
@media (max-width: 1023px), (prefers-reduced-motion: reduce) {
  /* The card's condensed line duplicates what .exp-detail states in full. */
  .exp-meta {
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
```

- [ ] **Step 2: Run the build and confirm it compiles**

```bash
cd "d:/.lib/withLatx/shejin-portfolio" && npm run build
```

Expected: exits 0, ends with a `✔ ... Server built` / `Σ Total size` summary.
Any `[vue/compiler-sfc]` or "Cannot resolve" error is a failure — fix before
continuing.

- [ ] **Step 3: Verify the static render**

Start the dev server:

```bash
cd "d:/.lib/withLatx/shejin-portfolio" && npm run dev
```

Write `scratchpad/check-task1.js`:

```js
const { chromium } = require('playwright')

;(async () => {
  const browser = await chromium.launch()
  const fails = []

  for (const [label, opts] of [
    ['narrow', { viewport: { width: 500, height: 900 } }],
    ['reduced-motion-desktop', { viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' }]
  ]) {
    const page = await browser.newPage(opts)
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' })
    await page.locator('#experience').scrollIntoViewIfNeeded()
    await page.waitForTimeout(400)

    const cards = page.locator('#experience .exp-card')
    const n = await cards.count()
    if (n !== 4) fails.push(`${label}: expected 4 cards, got ${n}`)

    // Every bullet must be genuinely visible on the static path.
    const bullets = page.locator('#experience .exp-bullet')
    const bn = await bullets.count()
    if (bn !== 8) fails.push(`${label}: expected 8 bullets, got ${bn}`)
    for (let i = 0; i < bn; i++) {
      if (!(await bullets.nth(i).isVisible())) fails.push(`${label}: bullet ${i} hidden`)
    }

    // Cards must stack in flow, never overlap.
    const boxes = await cards.evaluateAll((els) => els.map((e) => e.getBoundingClientRect().top))
    for (let i = 1; i < boxes.length; i++) {
      if (boxes[i] <= boxes[i - 1]) fails.push(`${label}: card ${i} is not below card ${i - 1}`)
    }

    await page.screenshot({ path: `scratchpad/task1-${label}.png`, fullPage: true })
    await page.close()
  }

  await browser.close()
  console.log(fails.length ? 'FAIL\n' + fails.join('\n') : 'PASS')
  process.exit(fails.length ? 1 : 0)
})()
```

Run it. Expected: `PASS`.

**Manual fallback:** open `http://localhost:3000#experience` at 500px wide.
Confirm four entries, hairline-separated, each showing role, full company,
full date range, and every bullet. Then set the OS "reduce motion" preference
and confirm the same at 1440px.

- [ ] **Step 4: Commit**

See "A note on commits" at the end of this plan — this repo is rooted at `D:\`
with no commits, so confirm with the user before running any `git add`. If
they've said yes:

```bash
cd "d:/.lib/withLatx/shejin-portfolio" && git add components/ExperienceSection.vue docs/superpowers && git commit -m "refactor(experience): replace 3D carousel markup with flat static list"
```

---

### Task 2: The pinned stage geometry

Add the motion-path media query and the per-card lane data. After this task
the desktop stage exists and measures correctly, but nothing moves — cards sit
at their resting offsets below the fold at `opacity: 0`, which is exactly the
`p = 0` state Task 3's scrub starts from.

**Files:**
- Modify: `components/ExperienceSection.vue`

**Interfaces:**
- Consumes: everything Task 1 produced.
- Produces, for Task 3:
  - `const LANES: Array<{ x: number; top: number; drift: number }>` — module-scope, 4 entries.
  - `const TRAVEL_VH = 375`, `const SCROLL_FACTOR = 0.9`, `const DRIFT_PX = 26`, `const FADE = 0.08`.
  - Cards carry `--exp-x` (percent string) and `--exp-top` (vh string) inline.
  - CSS pre-hydration state `transform: translateY(var(--exp-top)); opacity: 0` on `.exp-card`, which Task 3's first `apply()` reproduces exactly so there is no first-frame jump.

- [ ] **Step 1: Add the geometry constants to `<script setup>`**

Insert directly below the `items` array, above `const sectionRef`:

```ts
// Horizontal lanes and resting offsets for the pinned deck. `x` percentages
// come from the reference screenshots, where cards 01/02/03 sit at ~7%, ~50%
// and ~17% of viewport width; lane 3 continues the alternation. `top` places
// every card below the fold at rest, ~65vh apart — the one-at-a-time rhythm
// the reference shows. `drift` alternates so adjacent cards float apart rather
// than in lockstep.
const LANES = [
  { x: 6, top: 110, drift: 1 },
  { x: 50, top: 175, drift: -1 },
  { x: 20, top: 245, drift: 1 },
  { x: 62, top: 310, drift: -1 }
]

// The last card's resting offset (310vh) plus its height (~54vh) plus margin —
// exactly enough scroll for card 4 to clear the top edge and no more.
const TRAVEL_VH = 375

// Pin distance is TRAVEL × this, so cards rise slightly faster than the
// scroll. That over-speed is the lift that reads as floating rather than as a
// background plate sliding past. This is the dial to turn if the section feels
// too long or too twitchy.
const SCROLL_FACTOR = 0.9

// Bounded float: peaks mid-travel, zero at entry and exit, so cards visibly
// separate and re-converge but cannot collide or leave their lane. Per-card
// speed multipliers were rejected — over 375vh of travel they diverge without
// bound.
const DRIFT_PX = 26

// Fraction of a card's own travel spent fading in, and again fading out, so it
// emerges rather than hard-clipping at the stage edge.
const FADE = 0.08

function cardVars(i: number) {
  return { '--exp-x': `${LANES[i].x}%`, '--exp-top': `${LANES[i].top}vh` }
}
```

- [ ] **Step 2: Bind the custom properties in the template**

Change the `<article>` opening tag from:

```vue
      <article v-for="(item, i) in items" :key="item.years" class="exp-card">
```

to:

```vue
      <article v-for="(item, i) in items" :key="item.years" class="exp-card" :style="cardVars(i)">
```

- [ ] **Step 3: Add the motion-path media query**

Insert this block in `<style scoped>` immediately *above* the existing
`@media (max-width: 1023px), (prefers-reduced-motion: reduce)` block:

```css
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
    background: #f2f0eb;
    /* Pre-hydration state, matching what Task 3's apply() writes at p = 0 — so
       the first GSAP tick is not a visible jump. Without it all four cards
       render stacked on the heading for a frame. */
    transform: translateY(var(--exp-top));
    opacity: 0;
    will-change: transform, opacity;
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
```

- [ ] **Step 4: Run the build**

```bash
cd "d:/.lib/withLatx/shejin-portfolio" && npm run build
```

Expected: exits 0.

- [ ] **Step 5: Verify the geometry**

With `npm run dev` running, write `scratchpad/check-task2.js`:

```js
const { chromium } = require('playwright')

const LANES = [
  { x: 6, top: 110 },
  { x: 50, top: 175 },
  { x: 20, top: 245 },
  { x: 62, top: 310 }
]

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' })
  await page.locator('#experience').scrollIntoViewIfNeeded()
  await page.waitForTimeout(500)

  const fails = []
  const vw = 1440
  const vh = 900

  const data = await page.evaluate(() => {
    const stage = document.querySelector('#experience .exp-stage')
    const sr = stage.getBoundingClientRect()
    return {
      stageH: sr.height,
      stageW: sr.width,
      overflow: getComputedStyle(stage).overflow,
      cards: [...document.querySelectorAll('#experience .exp-card')].map((c) => {
        const r = c.getBoundingClientRect()
        return { left: r.left - sr.left, top: r.top - sr.top, w: r.width, h: r.height }
      }),
      detailClip: getComputedStyle(document.querySelector('#experience .exp-detail')).clip,
      wordSize: parseFloat(getComputedStyle(document.querySelector('#experience .exp-word')).fontSize)
    }
  })

  if (Math.abs(data.stageH - vh) > 2) fails.push(`stage height ${data.stageH}, expected ~${vh}`)
  if (Math.abs(data.stageW - vw) > 2) fails.push(`stage not full-bleed: ${data.stageW}`)
  if (data.overflow !== 'hidden') fails.push(`stage overflow is ${data.overflow}`)
  if (data.cards.length !== 4) fails.push(`expected 4 cards, got ${data.cards.length}`)
  if (data.detailClip !== 'rect(0px, 0px, 0px, 0px)') fails.push(`.exp-detail not sr-only: ${data.detailClip}`)
  if (data.wordSize < 100) fails.push(`heading only ${data.wordSize}px, expected clamp(44,10.5vw,150) = 151→150`)

  data.cards.forEach((c, i) => {
    const expLeft = (LANES[i].x / 100) * vw
    const expTop = (LANES[i].top / 100) * vh
    if (Math.abs(c.left - expLeft) > 2) fails.push(`card ${i} left ${c.left}, expected ${expLeft}`)
    if (Math.abs(c.top - expTop) > 2) fails.push(`card ${i} top ${c.top}, expected ${expTop}`)
    if (c.top < vh) fails.push(`card ${i} is not below the fold at rest (top ${c.top})`)
    if (c.left + c.w > vw) fails.push(`card ${i} overflows the right edge (${c.left + c.w} > ${vw})`)
  })

  await page.screenshot({ path: 'scratchpad/task2-stage.png' })
  await browser.close()
  console.log(fails.length ? 'FAIL\n' + fails.join('\n') : 'PASS')
  process.exit(fails.length ? 1 : 0)
})()
```

Run it. Expected: `PASS`, and `task2-stage.png` shows the giant centred
EXPERIENCE with the eyebrow above it and an otherwise empty frame.

**Manual fallback:** at 1440×900, the section should be exactly one viewport
tall, showing only the eyebrow and a very large centred EXPERIENCE. No cards
visible — they are parked below the fold. In devtools, each `.exp-card` should
report `left` of 6/50/20/62% and `transform: translateY(110vh…310vh)`.

- [ ] **Step 6: Commit** (same caveat as Task 1 Step 4)

```bash
cd "d:/.lib/withLatx/shejin-portfolio" && git add components/ExperienceSection.vue && git commit -m "feat(experience): add pinned stage geometry and card lanes"
```

---

### Task 3: The scrub

Wire the pin and the scroll-driven motion. This is the task that makes the
section work.

**Files:**
- Modify: `components/ExperienceSection.vue`

**Interfaces:**
- Consumes: `LANES`, `TRAVEL_VH`, `SCROLL_FACTOR`, `DRIFT_PX`, `FADE`, `sectionRef`, `stageRef` from Tasks 1–2.
- Produces: nothing new for later tasks. Task 4 only audits.

- [ ] **Step 1: Import GSAP**

Change the first import line of `<script setup>` from:

```ts
import { useReveal } from '~/composables/useReveal'
```

to:

```ts
import { gsap } from 'gsap'
import { useReveal } from '~/composables/useReveal'
```

- [ ] **Step 2: Replace `onMounted` with the matchMedia block**

Replace:

```ts
onMounted(() => {
  useReveal(sectionRef.value)
})
```

with:

```ts
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

    // Geometry is vh-derived, so it is measured against the live viewport on
    // every refresh rather than captured once at load. Card height is read
    // from the DOM rather than assumed from the CSS clamp.
    let travel = 0
    let tops: number[] = []
    let windows: Array<{ enter: number; span: number }> = []

    const measure = () => {
      const vh = window.innerHeight
      travel = (TRAVEL_VH / 100) * vh
      tops = LANES.map((lane) => (lane.top / 100) * vh)
      windows = cards.map((card, i) => {
        const enter = (tops[i] - vh) / travel
        const exit = (tops[i] + card.offsetHeight) / travel
        return { enter, span: Math.max(exit - enter, 0.0001) }
      })
    }

    // Every card's position is a pure function of p, so scrubbing backwards
    // and parking mid-travel both fall out for free.
    const apply = () => {
      for (let i = 0; i < cards.length; i++) {
        const t = gsap.utils.clamp(0, 1, (state.p - windows[i].enter) / windows[i].span)

        // The float. sin(t·π) is zero at both ends and peaks mid-travel, so
        // this can never push a card outside the window its fade is computed
        // against, and adjacent cards (opposite drift) cannot converge.
        const float = LANES[i].drift * Math.sin(t * Math.PI) * DRIFT_PX

        setters[i].y(tops[i] - state.p * travel + float)
        setters[i].fade(
          gsap.utils.clamp(0, 1, t / FADE) * gsap.utils.clamp(0, 1, (1 - t) / FADE)
        )
      }
    }

    measure()
    apply()

    gsap.timeline({
      scrollTrigger: {
        trigger: sectionRef.value,
        start: 'top top',
        end: () => `+=${(TRAVEL_VH / 100) * window.innerHeight * SCROLL_FACTOR}`,
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
```

- [ ] **Step 3: Run the build**

```bash
cd "d:/.lib/withLatx/shejin-portfolio" && npm run build
```

Expected: exits 0.

- [ ] **Step 4: Verify the motion**

With `npm run dev` running, write `scratchpad/check-task3.js`:

```js
const { chromium } = require('playwright')

const TRAVEL_VH = 375
const SCROLL_FACTOR = 0.9

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const vh = 900
  const pinDistance = (TRAVEL_VH / 100) * vh * SCROLL_FACTOR

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' })
  // ScrollTrigger inserts a pin-spacer on mount, which shifts the section's
  // flow position. Measure after that has settled, not immediately after load.
  await page.waitForTimeout(1000)

  const expTop = await page.evaluate(
    () => document.querySelector('#experience').getBoundingClientRect().top + window.scrollY
  )

  const fails = []
  const seen = new Map() // card index -> [min top, max top]

  const sample = async (f) => {
    await page.evaluate((y) => window.scrollTo(0, y), expTop + f * pinDistance)
    await page.waitForTimeout(900) // scrub: 0.8 needs time to settle
    return page.evaluate(() =>
      [...document.querySelectorAll('#experience .exp-card')].map((c) => {
        const r = c.getBoundingClientRect()
        return { top: r.top, bottom: r.bottom, left: r.left, op: parseFloat(getComputedStyle(c).opacity) }
      })
    )
  }

  // The section must actually pin: its top stays at 0 across the whole range.
  for (const f of [0.15, 0.35, 0.55, 0.75, 0.95]) {
    const cards = await sample(f)
    const secTop = await page.evaluate(
      () => document.querySelector('#experience').getBoundingClientRect().top
    )
    if (Math.abs(secTop) > 2) fails.push(`f=${f}: section not pinned (top ${secTop})`)

    cards.forEach((c, i) => {
      const rec = seen.get(i) || [Infinity, -Infinity]
      seen.set(i, [Math.min(rec[0], c.top), Math.max(rec[1], c.top)])
      // Lanes must hold — the float is vertical only.
      const expLeft = [6, 50, 20, 62][i] / 100 * 1440
      if (Math.abs(c.left - expLeft) > 2) fails.push(`f=${f}: card ${i} left drifted to ${c.left}`)
    })

    await page.screenshot({ path: `scratchpad/task3-p${String(f).replace('.', '')}.png` })
  }

  // Every card must travel upward and cross the viewport.
  seen.forEach(([min, max], i) => {
    if (max - min < vh * 0.5) fails.push(`card ${i} barely moved (${(max - min).toFixed(0)}px)`)
    if (min > vh) fails.push(`card ${i} never entered the viewport (min top ${min.toFixed(0)})`)
  })

  // At the end of the pin the stage must be empty — every card cleared the top.
  const atEnd = await sample(1)
  atEnd.forEach((c, i) => {
    // Use the card's real bottom edge — the height clamp resolves differently
    // per viewport, so a hard-coded height gives false passes here.
    if (c.bottom > 0 && c.op > 0.05) fails.push(`card ${i} still on screen at p=1 (bottom ${c.bottom.toFixed(0)}, opacity ${c.op})`)
  })

  // Scrubbing back must restore the earlier state — the whole point of driving
  // position from a pure function of p.
  const back = await sample(0.35)
  const fwd = await sample(0.75)
  const backAgain = await sample(0.35)
  back.forEach((c, i) => {
    if (Math.abs(c.top - backAgain[i].top) > 4) {
      fails.push(`card ${i} did not return on scroll-back: ${c.top.toFixed(0)} vs ${backAgain[i].top.toFixed(0)}`)
    }
  })
  void fwd

  await browser.close()
  console.log(fails.length ? 'FAIL\n' + fails.join('\n') : 'PASS')
  process.exit(fails.length ? 1 : 0)
})()
```

Run it. Expected: `PASS`.

Then open `scratchpad/task3-p035.png` and `task3-p055.png` alongside
`assets/img/sc/experience/2.png`. They should show the same thing: two or
three cards at different heights in different lanes, in front of the heading,
one entering from the bottom.

**Manual fallback:** scroll slowly through the section. Cards should rise one
at a time from below, drift slightly apart as they cross, pass in front of
EXPERIENCE, and clip out at the top. The section should hold still (pinned)
the whole time. Scroll back up — cards must retrace exactly, with no jump.

- [ ] **Step 5: Commit** (same caveat as Task 1 Step 4)

```bash
cd "d:/.lib/withLatx/shejin-portfolio" && git add components/ExperienceSection.vue && git commit -m "feat(experience): scrub cards up the pinned stage with bounded float"
```

---

### Task 4: Resize, reduced motion, and removal audit

The section is functionally complete. This task proves it survives the two
things pinned scroll animations habitually break on, and confirms nothing from
the 3D version survived the rewrite.

**Files:**
- Modify: `components/ExperienceSection.vue` (only if a check fails)

**Interfaces:**
- Consumes: the finished component.
- Produces: nothing.

- [ ] **Step 1: Confirm every removed thing is gone**

```bash
cd "d:/.lib/withLatx/shejin-portfolio" && grep -nE "rotationY|transformPerspective|preserve-3d|backface|translateZ|badgeTint|pointsVars|activeIndex|aria-live|carouselActive|exp-panel|exp-badge|exp-year|exp-points|icons\[" components/ExperienceSection.vue
```

Expected: **no output** (grep exits 1). Any hit is leftover 3D-carousel code
and must be deleted.

Then confirm the backup is untouched:

```bash
cd "d:/.lib/withLatx/shejin-portfolio" && git status --short components/ExperienceSection-3d.vue
```

Expected: no modification line for that file.

- [ ] **Step 2: Confirm the media queries are exhaustive and matched**

```bash
cd "d:/.lib/withLatx/shejin-portfolio" && grep -nE "min-width: 1024px|max-width: 1023px|prefers-reduced-motion" components/ExperienceSection.vue
```

Expected exactly three hits: the `gsap.matchMedia` string, the motion-path
`@media`, and the static `@media`. The first two strings must be character-
identical: `(min-width: 1024px) and (prefers-reduced-motion: no-preference)`.

- [ ] **Step 3: Verify resize and reduced motion**

With `npm run dev` running, write `scratchpad/check-task4.js`:

```js
const { chromium } = require('playwright')

;(async () => {
  const browser = await chromium.launch()
  const fails = []

  // --- Resize mid-pin: geometry must re-measure against the new viewport ---
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' })
    const expTop = await page.evaluate(
      () => document.querySelector('#experience').getBoundingClientRect().top + window.scrollY
    )
    await page.evaluate((y) => window.scrollTo(0, y), expTop + 0.5 * 3.375 * 900)
    await page.waitForTimeout(900)

    await page.setViewportSize({ width: 1280, height: 720 })
    await page.waitForTimeout(1200) // ScrollTrigger.refresh + onRefresh

    const cards = await page.evaluate(() =>
      [...document.querySelectorAll('#experience .exp-card')].map((c) => {
        const r = c.getBoundingClientRect()
        return { left: r.left, top: r.top, h: r.height }
      })
    )
    cards.forEach((c, i) => {
      const expLeft = ([6, 50, 20, 62][i] / 100) * 1280
      if (Math.abs(c.left - expLeft) > 2) fails.push(`resize: card ${i} left ${c.left}, expected ${expLeft}`)
      if (c.left + 260 > 1280) fails.push(`resize: card ${i} overflows right edge`)
    })
    // Heights must re-derive from the new viewport (clamp(320px, 54vh, 520px)
    // at vh=720 is 389px). A card still 486px tall means the geometry was
    // captured at load instead of re-measured on refresh.
    cards.forEach((c, i) => {
      if (Math.abs(c.h - 389) > 4) fails.push(`resize: card ${i} height ${c.h}, expected ~389`)
    })
    await page.screenshot({ path: 'scratchpad/task4-resized.png' })
    await page.close()
  }

  // --- Reduced motion at desktop width: static list, no pin, bullets shown ---
  {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
      reducedMotion: 'reduce'
    })
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' })
    await page.locator('#experience').scrollIntoViewIfNeeded()
    await page.waitForTimeout(500)

    const info = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('#experience .exp-card')]
      return {
        positions: cards.map((c) => getComputedStyle(c).position),
        opacities: cards.map((c) => parseFloat(getComputedStyle(c).opacity)),
        stageH: document.querySelector('#experience .exp-stage').getBoundingClientRect().height,
        bulletsVisible: [...document.querySelectorAll('#experience .exp-bullet')].every(
          (b) => b.getBoundingClientRect().height > 0
        )
      }
    })
    if (info.positions.some((p) => p === 'absolute')) fails.push('reduced-motion: cards still absolute')
    if (info.opacities.some((o) => o < 0.99)) fails.push('reduced-motion: a card is not opaque')
    if (info.stageH <= 900) fails.push(`reduced-motion: stage still 100vh (${info.stageH})`)
    if (!info.bulletsVisible) fails.push('reduced-motion: bullets not visible')
    await page.screenshot({ path: 'scratchpad/task4-reduced.png', fullPage: true })
    await page.close()
  }

  await browser.close()
  console.log(fails.length ? 'FAIL\n' + fails.join('\n') : 'PASS')
  process.exit(fails.length ? 1 : 0)
})()
```

Run it. Expected: `PASS`.

**Manual fallback:** at 1440px, scroll to the middle of the pinned section,
then drag the window narrower to ~1280px. Cards must snap to their new lane
percentages and stay inside the frame — not stranded off-screen or overlapping
the right edge. Separately, enable the OS reduce-motion setting and reload:
the section must be an ordinary scrolling list with all bullets visible.

- [ ] **Step 4: Final build**

```bash
cd "d:/.lib/withLatx/shejin-portfolio" && npm run build
```

Expected: exits 0.

- [ ] **Step 5: Commit** (same caveat as Task 1 Step 4)

```bash
cd "d:/.lib/withLatx/shejin-portfolio" && git add components/ExperienceSection.vue && git commit -m "test(experience): verify resize, reduced motion, and 3D removal"
```

---

## A note on commits

This project sits inside a git repository whose root is `D:\` itself. It has
**no commits**, and `git status` reports thousands of untracked directories
(`davcms/`, `Learning/`, `$RECYCLE.BIN/`, …) plus staged-then-deleted entries
from an unrelated `social-portal-app`.

Do not run `git add` here without asking. The commit steps above are written
out so they are ready if the user wants them, but the sane options are:

1. Skip commits entirely for this work.
2. `git init` a real repository at `d:/.lib/withLatx/shejin-portfolio` first,
   then commit normally.

Raise this with the user at Task 1 Step 4 and follow their answer for the rest
of the plan.

## Tuning dials

If the result needs adjusting after Task 3, these are the knobs, all at the top
of `<script setup>`:

| Symptom | Dial |
|---|---|
| Section takes too long to scroll through | Lower `SCROLL_FACTOR` (0.9 → 0.7) |
| Cards fly past too fast / feel twitchy | Raise `SCROLL_FACTOR` toward 1.1 |
| Cards feel rigid, not floaty | Raise `DRIFT_PX` (26 → 40) |
| Too many cards on screen at once | Widen the `top` gaps in `LANES` and raise `TRAVEL_VH` by the same total |
| Cards pop in at the bottom edge | Raise `FADE` (0.08 → 0.14) |
| Cards feel bunched to one side | Change the `x` values in `LANES` |
