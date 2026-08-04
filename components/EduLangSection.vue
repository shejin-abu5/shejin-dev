<script setup lang="ts">
import { useReveal } from '~/composables/useReveal'
import { useBallPerch } from '~/composables/useScrollBall'

const sectionRef = ref<HTMLElement | null>(null)
const eduRailRef = ref<HTMLElement | null>(null)
const langRailRef = ref<HTMLElement | null>(null)

// Stroked in a 24×24 box, same as the skills glyphs — a mortarboard and a
// speech bubble. Deliberately not the globe: that one is already spoken for by
// the Accessibility & localization card two sections up.
const CAP = [
  'm12 4.2 9.8 4.4-9.8 4.4-9.8-4.4 9.8-4.4Z',
  'M6.6 11v4.4c0 1.5 2.4 2.7 5.4 2.7s5.4-1.2 5.4-2.7V11',
  'M21.3 9.2v4.6'
]

const BUBBLE = [
  'M4 4.5h16a1.5 1.5 0 0 1 1.5 1.5v9a1.5 1.5 0 0 1-1.5 1.5h-9.5l-4.5 3.5V16.5H4A1.5 1.5 0 0 1 2.5 15V6A1.5 1.5 0 0 1 4 4.5Z',
  'M7 9h10',
  'M7 12h6'
]

interface Language {
  /** The name in its own writing system. Equal to `name` for English. */
  native: string
  name: string
  /** BCP 47, for the `lang` attribute — the scripts are only correct to a
      screen reader or a font matcher if the language is declared. */
  code: string
  level: string
}

// English first, deliberately not ordered by fluency. Native → conversational
// would put Malayalam at the top, which is tidy and professionally backwards:
// English is the working language of every role on this CV.
const LANGUAGES: Language[] = [
  { native: 'English', name: 'English', code: 'en', level: 'Fluent' },
  { native: 'മലയാളം', name: 'Malayalam', code: 'ml', level: 'Native' },
  { native: 'हिन्दी', name: 'Hindi', code: 'hi', level: 'Conversational' }
]

function setLangRail(el: unknown, i: number) {
  if (i === LANGUAGES.length - 1) langRailRef.value = (el as HTMLElement | null) ?? null
}

// The ball's last two perches. Both are real hairlines already in the layout —
// the rule under Education's eyebrow, and the `border-top` on Languages' last
// row — rather than rules added for it. Education's rule and Languages' *last*
// row: same-height surfaces would give the ball a flat sideways hop with no
// fall in it, and the two-row offset between the columns is exactly the drop
// that beat needs. Both cards open with the same eyebrow block, so Education's
// rule and Languages' first row-border sit at the same y — the drop is two
// language rows, and nothing else.
// Half-width rows, so half the window the full-width rules get — same pace
// across the page. Languages picks up where Education leaves off, with no
// overlap between the two.
useBallPerch(() => eduRailRef.value, {
  trigger: () => sectionRef.value,
  // Starts once the row is properly in frame, not while it is still down in
  // the bottom fade band — landing there means arriving at 20% opacity and
  // brightening in place, which reads as the ball blinking rather than
  // touching down.
  start: 'top 74%',
  end: 'top 40%',
  from: 0.08,
  to: 0.82
})

// This is the last perch on the page, and the page runs out shortly after it —
// so the window has to sit where the row is still in frame. Pushed any later
// and the ball spends its final roll riding a rail that has already scrolled
// out the top, which is not a roll anyone sees.
useBallPerch(() => langRailRef.value, {
  trigger: () => sectionRef.value,
  start: 'top 14%',
  end: 'top -24%',
  to: 0.82
})

onMounted(() => {
  useReveal(sectionRef.value)
})
</script>

<template>
  <section ref="sectionRef" class="py-24 md:py-[120px]">
    <!--
      Narrower than the 1240px every other section runs at. Two cards holding a
      degree and three languages do not need the full measure, and pulling them
      in reads as a coda rather than a fifth act.
    -->
    <div class="mx-auto max-w-[960px] px-5 md:px-8">
      <h2 class="sr-only">Education and Languages</h2>

      <div class="edu-grid">
        <article class="reveal edu-card">
          <svg class="edu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path v-for="d in CAP" :key="d" :d="d" />
          </svg>


          <!-- A real hairline, and the surface the page's ball lands on. It
               sits at the same y as Languages' first row-border, which is what
               makes the fall between the two columns exactly two rows. -->
          <span ref="eduRailRef" class="edu-rail" aria-hidden="true" />

          <div class="edu-body">
            <!-- One degree is one fact. Splitting it across two rows to match
                 the column beside it was padding, not structure. -->
            <h3 class="edu-degree">BCA in Computer Science</h3>
            <p class="edu-meta">Bharathiar University, India</p>
            <p class="edu-meta">2008 — 2011</p>
          </div>
        </article>

        <article class="reveal edu-card">
          <svg class="edu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path v-for="d in BUBBLE" :key="d" :d="d" />
          </svg>

          <!-- <p class="edu-eyebrow">Languages</p> -->

          <ul class="lang-list">
            <li
              v-for="(lang, i) in LANGUAGES"
              :key="lang.code"
              :ref="(el) => setLangRail(el, i)"
              class="lang-row"
            >
              <span class="lang-names">
                <!-- The writing system is the point. `lang` is what makes it
                     correct rather than decorative: it drives font matching and
                     tells a screen reader which voice to use. -->
                <span :lang="lang.code" class="lang-native">{{ lang.native }}</span>
                <span v-if="lang.native !== lang.name" class="lang-roman">{{ lang.name }}</span>
              </span>

              <span class="lang-level">{{ lang.level }}</span>
            </li>
          </ul>
        </article>
      </div>
    </div>
  </section>
</template>

<style scoped>
.edu-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.25rem;
}

@media (min-width: 768px) {
  .edu-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Monochrome now: no hairline, no tint, nothing but paper, one ink glyph and
   the type. Everything the card has to say about itself, it says through
   weight and elevation. */
.edu-card {
  border-radius: 22px;
  background: theme('colors.paper');
  /* The only thing separating the card now — no hairline, no tint cap, and
     paper on paper-soft is a two-percent step. Three layers rather than one
     big blur: a contact shadow to keep the edge crisp, a mid layer for the
     near falloff, and a wide negative-spread layer for the lift. A single
     large blur at this strength goes grey and muddy instead of deep. */
  box-shadow:
    0 1px 2px rgb(18 18 18 / 0.05),
    0 6px 14px -8px rgb(18 18 18 / 0.12),
    0 24px 48px -24px rgb(18 18 18 / 0.26);
  padding: 1.75rem 1.5rem 1.5rem;
}

/* Decorative: the eyebrow underneath says the same thing in words, so it is
   aria-hidden. Ink at 34px makes it the card's one piece of weight, which is
   the job the tint cap used to do. */
.edu-icon {
  display: block;
  height: 44px;
  width: 44px;
  margin-bottom: 0.875rem;
  color: theme('colors.ink');
}

/* This block and the icon above it are identical in both cards, which is what
   aligns Education's rule with Languages' first row-border — the ball's fall
   depends on it. */
.edu-eyebrow {
  margin-bottom: 1.125rem;
  font-family: theme('fontFamily.data');
  font-size: 11px;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: theme('colors.steel');
}

.edu-rail {
  height: 1px;
  background: theme('colors.hair');
  display: none;
}

.edu-body {
  padding-top: 1.25rem;
}

.edu-degree {
  font-family: theme('fontFamily.display');
  font-size: clamp(20px, 1.9vw, 26px);
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.015em;
  text-wrap: balance;
}

.edu-meta {
  margin-top: 0.5rem;
  font-family: theme('fontFamily.data');
  font-size: 12px;
  line-height: 1.5;
  color: theme('colors.steel');
}

.lang-list {
  list-style: none;
}

.lang-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  min-height: 56px;
  padding: 0.5rem 0;
}

.lang-names {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

/* Inter carries no Malayalam or Devanagari, so the browser substitutes a
   system face for those two — hence the loose line-height, which is what those
   scripts need for their ascenders and matras rather than a preference. */
.lang-native {
  font-size: 21px;
  line-height: 1.4;
  letter-spacing: -0.01em;
}

.lang-roman {
  font-family: theme('fontFamily.data');
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: theme('colors.steel');
}

/* Ink where the roman name is steel: this is the thing the section is actually
   asked, and the one word a reader scans each row for. */
.lang-level {
  flex-shrink: 0;
  font-family: theme('fontFamily.data');
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: theme('colors.ink');
}
</style>
