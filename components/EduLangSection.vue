<script setup lang="ts">
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useReveal } from '~/composables/useReveal'
import { BALL_QUERY, useBallPerch } from '~/composables/useScrollBall'

/**
 * How much scroll the pin absorbs.
 *
 * This used to be shared with the footballer's header, which was scrubbed over
 * the identical range. He is gone from this section, and the number stays
 * exactly where he left it — see the pin itself for why it outlived him.
 */
const PIN_SCROLL = 620

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

// The ball's last two rolling perches: the top edge of Education's body block,
// and Languages' *last* row. Two surfaces at the same height would give the
// ball a flat sideways hop with no fall in it, and the two-row offset between
// the columns is exactly the drop that beat needs.
//
// Half-width cards, so half the window the full-width rules get — same pace
// across the page. Languages picks up where Education leaves off, with no
// overlap between the two.
// Both windows are struck against the *section* top, but the surfaces sit well
// inside it — the body block 206px down, Languages' last row 325px — so the
// percentages here read lower than where the ball actually lands. 58% puts the
// body edge at about three quarters of the frame: in view and clear of the
// bottom fade band, rather than the 74% it used to say, which put it at the
// very bottom edge and had the ball arriving at half strength.
useBallPerch(() => eduRailRef.value, {
  trigger: () => sectionRef.value,
  start: 'top 58%',
  end: 'top 32%',
  // The window is the pace. Both cards give the ball rather less than their
  // full width to cross, so it travels at about six tenths of what the page
  // does — an amble rather than a dash.
  from: 0.1,
  to: 0.65,
  // A short fall, because it is a short hop: one card to the card beside it,
  // a couple of hundred px across and two language rows down. The default is
  // sized for crossing between sections and would spend more scroll on this
  // step than this section has to give.
  fall: 0.16
})

// The last rolling perch on the page — the footer takes the ball from here.
// The window has to sit where the row is still in frame: pushed any later and
// the ball spends its final roll riding a row that has already scrolled out
// the top, which is not a roll anyone sees.
//
// This is also the window that gives way when the tail of the page runs short.
// Everything from here to the footer's resting rule has to fit between the
// section arriving and the document ending, and on a tall viewport that whole
// stretch is only a couple of hundred px — the section and the footer very
// nearly fit on one screen together. The footer's perch cannot move (there is
// no page left to move it into), so the ball's resolver takes the shortfall
// out of this roll. It ends up brisk on a tall viewport and unhurried on a
// normal one, which is the right way round: a tall viewport is showing most of
// the section already.
useBallPerch(() => langRailRef.value, {
  trigger: () => sectionRef.value,
  start: 'top 22%',
  end: 'top -8%',
  to: 0.63,
  // The last hop on the page, and the one with the least room to make it in:
  // the footer's resting perch is anchored 150px from the end of the document
  // and cannot be moved, so everything between this rule and that one has to
  // fit in what the tail happens to have. Left at 0.1 the ball got 220px of
  // scroll for a 666px drop and arrived at 5.9px per px — by some distance the
  // fastest thing on the site, and the last thing anyone sees.
  //
  // Lengthening it alone did not fix it, and `holdExit` is why: read live, the
  // arc off this rule spent its first half rising, so the extra scroll bought a
  // taller lob rather than a gentler descent. With the launch height held the
  // two work together — a longer fall hands the ball over earlier, which leaves
  // it lower in the frame, so the drop shrinks as the scroll grows and the
  // landing slows twice over.
  //
  // 0.6 rather than more, and the ceiling is not this section's to raise. This
  // whole run is already floored at ROLL_MIN_RIDE, so every px the crossing
  // takes is a px off the legs either side of it — measured, 0.6 costs the hop
  // onto the Skills rule about a sixth of its pace and leaves the sideways exit
  // out of Skills alone; going further starts to tell. The only way to have
  // both is more page between the skills grid and the footer.
  fall: 0.6,
  holdExit: true
})

let mm: ReturnType<typeof gsap.matchMedia> | null = null

onMounted(() => {
  useReveal(sectionRef.value)

  mm = gsap.matchMedia()

  /**
   * Holds the section still for the ball's last roll.
   *
   * This pin was put here for the footballer's header, and that is the only
   * reason it was ever documented as having. It outlives him because it was
   * quietly doing a second job the whole time, and that job is now its only
   * one: it is what the ball's final roll is spent inside.
   *
   * The Languages perch below runs `top 22%` → `top -8%`, and the pin sits in
   * the middle of that window. Held, the section's top freezes at 0 and the
   * language row parks 325px down the frame — so the ball crosses it with the
   * row stationary and comfortably in view, over 620px of scroll it would not
   * otherwise have. Unpinned, the same window is 30% of a viewport, about
   * 324px at 1080, and the row is leaving the top of the frame for most of it.
   * That is the exact failure the perch's own note warns about: "the ball
   * spends its final roll riding a row that has already scrolled out the top,
   * which is not a roll anyone sees."
   *
   * So the hold is no longer covering a move — it *is* the move. Removing it
   * along with the player would compress the last roll on the page, and the
   * drop into the footer with it, to roughly a third of the scroll they were
   * tuned against.
   *
   * Gated on BALL_QUERY because there is no ball below it, so there would be
   * nothing to hold the page for.
   */
  mm.add(BALL_QUERY, () => {
    const el = sectionRef.value
    if (!el) return

    const st = ScrollTrigger.create({
      trigger: el,
      start: 'top top',
      end: `+=${PIN_SCROLL}`,
      pin: true,
      pinSpacing: true,
      anticipatePin: 1,
      invalidateOnRefresh: true
    })

    return () => st.kill()
  })
})

onBeforeUnmount(() => {
  mm?.revert()
})
</script>

<template>
  <section ref="sectionRef" class="relative py-12 md:py-[120px]">
    <div class="relative mx-auto max-w-[960px] px-5 md:px-8">
      <h2 class="sr-only">Education and Languages</h2>

      <div class="edu-grid">
        <article class="reveal edu-card">
          <svg class="edu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path v-for="d in CAP" :key="d" :d="d" />
          </svg>


          <div ref="eduRailRef" class="edu-body">
            <h3 class="edu-degree">BCA in Computer Science</h3>
            <p class="edu-meta">Bharathiar University, India</p>
            <p class="edu-meta">2008 — 2011</p>
          </div>
        </article>

        <article class="reveal edu-card">
          
          <svg class="edu-icon" xmlns="http://www.w3.org/2000/svg"  viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="1.536" stroke-linecap="round" stroke-linejoin="round"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M5 8l6 6"></path> <path d="M4 14l6-6 2-3"></path> <path d="M2 5h12"></path> <path d="M7 2h1"></path> <path d="M22 22l-5-10-5 10"></path> <path d="M14 18h6"></path> </g></svg>


          <ul class="lang-list">
            <li
              v-for="(lang, i) in LANGUAGES"
              :key="lang.code"
              :ref="(el) => setLangRail(el, i)"
              class="lang-row"
            >
              <span class="lang-names">
                <span :lang="lang.code" class="lang-native md:text-[21x] text-[16px]">{{ lang.native }}</span>
                <span v-if="lang.native !== lang.name" class="lang-roman">{{ lang.name }}</span>
              </span>

              <!-- <span class="lang-level">{{ lang.level }}</span> -->
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
