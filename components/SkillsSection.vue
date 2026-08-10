<script setup lang="ts">
import { gsap } from 'gsap'
import { useReveal } from '~/composables/useReveal'
import { useBallPerch } from '~/composables/useScrollBall'
import { useSwipeRail } from '~/composables/useSwipeRail'

interface SkillCard {
  category: string
  /** SVG path `d` strings, drawn stroked in a 24×24 box. No icon package is
      installed, and one wouldn't earn its weight for nine glyphs. */
  icon: string[]
  /** The chips on the back — one skill each, and the back's whole payload now
      that the explanatory sentence is gone. */
  stack: string[]
}

// The nine categories are unchanged. Six chips a card minimum, where this used
// to run two or three — a fuller list is the point of the flip now.
//
// The CV's own skills block is thinner than six under some of these headings
// (its State Management line is just "Pinia, Vuex"), so the extra chips come
// from three places, in this order of preference: the CV's other headings where
// an item belongs here more than where it was filed (code splitting and lazy
// loading are CV "Performance & Build Tools", and sit under Build tools);
// experience bullets (Vue Material and Ionic 4, Golden Star Media); and the
// practices the work itself demonstrates (ScrollTrigger drives every reveal in
// this repo, per plugins/gsap.client.ts). Nothing is a tool never used —
// Redux and Vite stay out, as neither appears anywhere in the CV.
//
// No chip repeats across cards, so nine backs read as nine lists rather than
// one list shuffled. That is what sends HTML5 to Languages while Semantic HTML
// and ARIA go to Accessibility, and CSS3 to Languages while SASS stays Styling.
const cards: SkillCard[] = [
  {
    category: 'Languages',
    icon: ['m9 8-4 4 4 4', 'm15 8 4 4-4 4', 'm13.5 6-3 12'],
    stack: ['JavaScript (ES6+)', 'TypeScript', 'HTML5', 'ES modules', 'JSON']
  },
  {
    category: 'Frameworks',
    icon: ['m12 3 8.5 4.5L12 12 3.5 7.5 12 3Z', 'm3.5 12 8.5 4.5 8.5-4.5', 'm3.5 16.5 8.5 4.5 8.5-4.5'],
    stack: ['Vue.js', 'React.js', 'Nuxt']
  },
  {
    category: 'State management',
    icon: [
      'M12 3.5c4.1 0 7 1.1 7 2.5s-2.9 2.5-7 2.5-7-1.1-7-2.5 2.9-2.5 7-2.5Z',
      'M5 6v12c0 1.4 2.9 2.5 7 2.5s7-1.1 7-2.5V6',
      'M19 12c0 1.4-2.9 2.5-7 2.5S5 13.4 5 12'
    ],
    stack: ['Pinia', 'Vuex', 'Redux', 'Reactive stores']
  },
  {
    category: 'Styling',
    icon: [
      'M12 3.2c3.3 3.5 5.6 6.4 5.6 9.2a5.6 5.6 0 1 1-11.2 0c0-2.8 2.3-5.7 5.6-9.2Z',
      'M9.4 13.6a2.6 2.6 0 0 0 2.6 2.6'
    ],
    stack: ['Tailwind CSS', 'SASS', 'LESS', 'CSS3', 'Design systems']
  },
  {
    category: 'Animation',
    icon: ['M4 18C8.5 18 9 7 20 7', 'M20 5.2a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6Z'],
    stack: ['GSAP', 'WebGL', 'canvas']
  },
  {
    category: 'Build tools',
    icon: ['M13.5 3 5.5 13.5h5.2L10 21l8-10.5h-5.2L13.5 3Z'],
    stack: ['Vite', 'Webpack', 'Babel', 'NPM', 'Code splitting', 'Lazy loading', 'Asset optimization']
  },
  {
    category: 'Developer tools',
    icon: [
      'M15.2 3.5a5 5 0 0 0-4.8 6.4l-6.3 6.3a1.6 1.6 0 0 0 0 2.2l1.5 1.5a1.6 1.6 0 0 0 2.2 0l6.3-6.3a5 5 0 0 0 6.4-4.8 5 5 0 0 0-.4-2l-3 3-2.6-.7-.7-2.6 3-3a5 5 0 0 0-1.6-.3Z'
    ],
    stack: ['Figma', 'Postman', 'Chrome DevTools', 'Asana', 'Agile/Scrum', 'Docker (basic)']
  },
  {
    category: 'Version control',
    icon: [
      'M6.5 3.5v11',
      'M17.5 3.5a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z',
      'M6.5 14.5a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z',
      'M17.5 9.5a8 8 0 0 1-8 8'
    ],
    stack: ['Git', 'GitHub', 'Code reviews', 'Branching workflows']
  },
  {
    category: 'Accessibility & localization',
    icon: [
      'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z',
      'M3.4 9.5h17.2',
      'M3.4 14.5h17.2',
      'M12 3c2.5 2.5 3.9 5.6 3.9 9s-1.4 6.5-3.9 9c-2.5-2.5-3.9-5.6-3.9-9s1.4-6.5 3.9-9Z'
    ],
    stack: ['WCAG 2.1', 'ARIA', 'Semantic HTML', 'Keyboard navigation', 'RTL-aware layouts', 'i18n']
  },
  {
  category: 'AI Product Building',
  icon: [
    'M12 2 14 10 22 12 14 14 12 22 10 14 2 12 10 10Z',
    'M19 3.5v3',
    'M20.5 5h-3'
  ],
  stack: ['AI-assisted coding', 'UI design workflows', 'Rapid prototyping', 'Component scaffolding']
}
]

const CHEVRON = 'm6 9.5 6 6 6-6'

const sectionRef = ref<HTMLElement | null>(null)
const railRef = ref<HTMLElement | null>(null)

// Below lg the grid is a swipe rail, the same as Work and Experience — see
// composables/useSwipeRail.ts. One card per slide: at ~326px the card is back
// to the width it has in the desktop grid, so it carries its full front and
// back rather than the compacted pair of columns this was.
const gridRef = ref<HTMLElement | null>(null)
const { active, isRail, goTo } = useSwipeRail(() => gridRef.value, '.skill-card')

const flipped = ref<boolean[]>(cards.map(() => false))

// Plain array, not a ref: these are only ever read inside a click handler, so
// making them reactive would cost a re-render per card on mount for nothing.
const flippers: (HTMLElement | null)[] = []

function setFlipper(el: unknown, i: number) {
  flippers[i] = (el as HTMLElement | null) ?? null
}

function toggle(i: number) {
  flipped.value[i] = !flipped.value[i]

  const el = flippers[i]
  if (!el) return

  const to = flipped.value[i] ? 180 : 0

  // Checked per click rather than once on mount, so flipping the OS setting
  // mid-session takes effect without a reload.
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    gsap.set(el, { rotationY: to, z: 0 })
    el.style.removeProperty('--lift')
    return
  }

  gsap
    .timeline({ defaults: { overwrite: 'auto' } })
    .to(el, { rotationY: to, duration: 0.7, ease: 'power3.inOut' }, 0)
    // The lift peaks at 0.35s — exactly mid-turn, when the card is edge-on and
    // has no face to read. A flat rotation reads as a texture swap; coming off
    // the page and back down is what makes it read as an object. `--lift` also
    // drives the shadow, so the card's ground shadow spreads as it rises.
    .to(
      el,
      {
        keyframes: [
          { z: 60, '--lift': 1, duration: 0.35, ease: 'power2.out' },
          { z: 0, '--lift': 0, duration: 0.35, ease: 'power2.in' }
        ],
        // Handing --lift back to the stylesheet at rest is what lets the CSS
        // hover state own it again; an inline 0 would outrank the hover rule
        // forever after the first flip.
        onComplete: () => el.style.removeProperty('--lift')
      },
      0
    )
}

// Ends well before the rule leaves the frame, so there is room below it for a
// real handoff into Education rather than a cut. `to` shortens the roll to
// match, keeping the pace the same as Selected Work's rule.
useBallPerch(() => railRef.value, {
  trigger: () => railRef.value,
  // In frame at both ends. At 104% the ball landed on a rule still below the
  // fold; 92% lands it on one you can see.
  start: 'top 92%',
  end: 'top 34%',
  // Lands halfway along and leaves from the far end — the opposite of what
  // this used to do, and for the same reason it used to do the opposite.
  //
  // The thinking before was that leaving from the middle shortened the
  // crossing to Education. It does not: that crossing goes off the right edge
  // of the frame and comes back in at the left, so its length is the distance
  // to the *right* edge plus the distance from the left, and stopping short of
  // the right-hand end makes the first of those longer, not shorter. Measured
  // at 1920: leaving at 0.5 costs 1694px of travel, leaving at 0.92 costs
  // 1212px. The rule the ball gives up rolling across it gets back on the way
  // out.
  //
  // Landing at 0.5 rather than 0 shortens the crossing *in* from the chart,
  // which ends on the right-hand side of the frame — the ball no longer has to
  // cross the whole width of the page to reach the start of this rule.
  from: 0.5,
  to: 0.92,
  // Sideways, for the same reason Selected Work's rule is: this rule sits
  // under the section *heading*, and the next perch is Education's hairline
  // the better part of a viewport and a half below it — with all nine skill
  // cards in between.
  //
  // Arced, that gap was not survivable. Both ends of a fall are read live, and
  // over a gap that long the departure point does not merely move, it leaves:
  // the rule climbs a full screen out of the frame at the page's own speed
  // while the target is still coming up from below. The arc is anchored to
  // whichever dominates, so the ball ran off the top of the screen with the
  // rule, hung there, then came back down onto Education at roughly twice
  // scroll speed to make up the difference. That is the jump.
  //
  // Off the edge and back in at the other side, there is no departure point
  // left to be dragged by — and the skill grid is content the ball has no
  // business rolling over anyway.
  side: true
})

onMounted(() => {
  useReveal(sectionRef.value)
})
</script>

<template>
  <section id="skills" ref="sectionRef" class="py-12 md:py-[120px]">
    <div class="mx-auto max-w-[1240px] px-5 md:px-8">
      <div class="mb-9 flex flex-wrap items-end justify-between gap-6">
        <div>
          <span class="mb-3.5 block font-data text-[13px] tracking-wide text-accent-text">03 — Stack</span>
          <h2 class="font-display text-[clamp(30px,4.5vw,58px)] font-black uppercase leading-none tracking-tight">
            Skills
          </h2>
        </div>
      </div>

      <span ref="railRef" class="mb-16 md:block hidden h-px w-full bg-hair" aria-hidden="true" />

      <div
        ref="gridRef"
        class="skill-grid swipe-rail"
        :role="isRail ? 'group' : undefined"
        :aria-roledescription="isRail ? 'carousel' : undefined"
        :aria-label="isRail ? 'Stack' : undefined"
        :tabindex="isRail ? 0 : undefined"
        @keydown.arrow-left.prevent="goTo(active - 1)"
        @keydown.arrow-right.prevent="goTo(active + 1)"
      >
        <div v-for="(card, i) in cards" :key="card.category" class="reveal skill-card">
          <div :ref="(el) => setFlipper(el, i)" class="skill-flipper">
            <div class="skill-face skill-face--front" :class="{ 'is-back': flipped[i] }" :aria-hidden="flipped[i]">
              <svg class="skill-ghost" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="0.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path v-for="d in card.icon" :key="d" :d="d" />
              </svg>

              <div class="skill-row skill-row--front">
                <h3 class="skill-name">{{ card.category }}</h3>
                <button
                  type="button"
                  class="skill-toggle"
                  :aria-expanded="flipped[i]"
                  :aria-controls="`skill-panel-${i}`"
                  :tabindex="flipped[i] ? -1 : 0"
                  @click="toggle(i)"
                >
                  <span class="sr-only">Show {{ card.category }} details</span>
                  <svg class="skill-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path :d="CHEVRON" />
                  </svg>
                </button>
              </div>
            </div>

            <div
              :id="`skill-panel-${i}`"
              class="skill-face skill-face--back"
              :class="{ 'is-back': !flipped[i] }"
              :aria-hidden="!flipped[i]"
            >
              <p class="skill-label">{{ card.category }}</p>

              <ul class="skill-chips">
                <li v-for="tech in card.stack" :key="tech" class="skill-chip">{{ tech }}</li>
              </ul>

              <div class="skill-row skill-row--back">
                <button
                  type="button"
                  class="skill-toggle"
                  :aria-expanded="flipped[i]"
                  :aria-controls="`skill-panel-${i}`"
                  :tabindex="flipped[i] ? 0 : -1"
                  @click="toggle(i)"
                >
                  <span class="sr-only">Hide {{ card.category }} details</span>
                  <svg class="skill-chev skill-chev--back" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path :d="CHEVRON" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="swipe-dots">
        <button
          v-for="(card, i) in cards"
          :key="`dot-${card.category}`"
          type="button"
          class="swipe-dot"
          :aria-label="`Show ${card.category}`"
          :aria-current="active === i ? 'true' : undefined"
          @click="goTo(i)"
        >
          <span />
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* The grid is the lg-and-up presentation; below it the nine cards are a rail,
   the same as Work and Experience. `display` is declared inside the query
   rather than at the top level on purpose: a scoped `.skill-grid` outranks
   `.swipe-rail` in assets/css/main.css, so a bare `display: grid` here would
   quietly win and leave a grid sitting inside a horizontal scroller. */
@media (min-width: 1024px) {
  .skill-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1.25rem;
  }
}

@media (max-width: 1023px) {
  .skill-grid {
    /* Matches the container's px-5. */
    --rail-gutter: 1.25rem;
    padding-block: 1.51rem;
    /*
      Capped, unlike the other two rails. A project card carries a screenshot
      and a role carries four bullets, so both earn a full-width frame; this
      one is a name, a glyph and a row of chips, and past ~420px it stops
      being a card and becomes a letterbox with a heading in the corner. On a
      phone the cap never binds — 326px at 390 — so this is really about the
      tablet range, where it shows a second card instead of stretching one.
    */
    --rail-item: min(calc(100% - var(--rail-peek)), 420px);
  }
}

@media (min-width: 768px) and (max-width: 1023px) {
  .skill-grid {
    /* Follows the container to md:px-8. */
    --rail-gutter: 2rem;
  }
}


/* display:grid so the flipper stretches to the row height the tallest card in
   the row set — otherwise short cards sit at their own height and the row
   reads ragged. */
.skill-card {
  display: grid;
  perspective: 1200px;
}

.skill-flipper {
  --lift: 0;
  position: relative;
  display: grid;
  /* Floor only. The grid-stack still grows past this for whichever face is
     taller, which since the chip lists went to six-plus is always the back —
     this is what keeps a card from collapsing into a letterbox while its front
     face is the shorter of the two. */
  min-height: 134px;
  transform-style: preserve-3d;
  will-change: transform;
}

/* Hover only where there is a real pointer — on touch this would latch on tap
   and stay lit after the card flips. */
@media (hover: hover) {
  .skill-card:hover .skill-flipper {
    --lift: 0.4;
  }
}

.skill-face {
  grid-area: 1 / 1;
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 0.875rem;
  padding: 1.375rem;
  border-radius: 22px;
  /* Clips the ghost glyph to the card's rounded corner. Safe on the faces —
     the preserve-3d lives on .skill-flipper, and overflow would flatten it
     only on the element that declares it. */
  overflow: hidden;
  background: theme('colors.paper');
  /* The section sits on paper as well, so the hairline is what draws the
     card's edge — at rest the shadow alone is not enough to separate white
     from white, and leaning on shadow hard enough to do it alone would read
     as a drop-shadowed box rather than a sheet of paper. */
  border: 1px solid theme('colors.hair');
  box-shadow:
    0 calc(2px + var(--lift) * 20px) calc(12px + var(--lift) * 34px) rgb(18 18 18 / calc(0.055 + var(--lift) * 0.1)),
    0 1px 2px rgb(18 18 18 / 0.04);
  backface-visibility: hidden;
  /* WebKit only learned the unprefixed property in Safari 15.4; below that an
     unprefixed-only declaration is dropped and neither face is ever culled. */
  -webkit-backface-visibility: hidden;
  cursor: pointer;
}

/*
  The 1px of Z on each face is load-bearing on WebKit, and the reason it is
  written on both is that it has to be measured from each face's own side.

  Both faces sit at grid-area 1/1, so before this they were exactly coplanar —
  the front at Z 0 and the back rotated 180deg about a plane through Z 0. Two
  surfaces occupying one plane leave the depth sort free to pick either, and
  `backface-visibility` on .skill-face does not settle it: it culls the face's
  own backface, but not a descendant WebKit has promoted to a layer of its own,
  which .skill-row is by virtue of its z-index. On iOS Safari the result was the
  front's category name painting through the flipped card mirrored, with its
  chevron alongside — the card read as two faces at once.

  translateZ applies after the rotation in each of these, so each face moves a
  pixel towards whichever side it is facing. That makes the face a 3D-positioned
  layer in its own right rather than a flat box in its parent's plane, and the
  whole subtree beneath it — promoted descendants included — is then culled as
  one unit when it turns away.

  1px because it only has to break the tie: at the 1200px perspective on
  .skill-card it is far below a pixel of parallax, so it buys the culling
  without moving anything on screen.
*/
.skill-face--front {
  transform: translateZ(1px);
}

.skill-face--back {
  transform: rotateY(180deg) translateZ(1px);
  justify-content: flex-start;
  gap: 0.75rem;
}

/* backface-visibility keeps the hidden face from being drawn, but it still
   hit-tests in some engines — a click near the back's chip row would land on
   the front's button underneath. */
.skill-face.is-back {
  pointer-events: none;
}

/* With the tile gone this is the card's only mark. Bled off the top-left
   corner and clipped by the radius, so it reads as a mark the card is cropping
   rather than a picture placed inside it.

   One flat mark on all nine — one colour system rather than nine, so the eye
   reads the grid as a set and the category names stay the thing that
   distinguishes one card from the next. Big enough to be the card's texture:
   it fills the whole upper half and runs off two edges.

   One rule now, where this used to fork at 1024px. The rail ran a different
   object below that line — a 60px accent icon sitting inside the card's
   padding at full strength — on the argument that a 6%-of-ink smudge cannot be
   read when only one card is on screen and would look like a printing fault.
   What that traded away was the card's one accent: an orange glyph at icon
   size competes with the category name instead of sitting behind it, and this
   mark is meant to be the card's texture, not a second heading.

   The geometry needs no fork either, because the cards are the same height on
   both sides of the line — the back face sets it, and its chip list wraps to
   three rows at 379px in the grid and at 326px on the rail alike, so both land
   near 208px. 186px hung at -40/-49 crops the same way in both.

   Steel rather than ink, at the opacity that keeps it a wash: 0.1 resolves to
   #F0F1F1 on paper against the #F0F0F0 that ink at 0.06 gave — the same value,
   half a step cooler. So this is a real change on the rail and a no-op in the
   grid. */
.skill-ghost {
  position: absolute;
  left: -40px;
  top: -49px;
  height: 186px;
  width: 186px;
  color: theme('colors.steel');
  /* Opacity, not `color`: the glyph is stroked with currentColor and the mark
     is one flat tone either way, so shifting it is a matter of how much of the
     paper shows through rather than which shade it is. */
  opacity: 0.1;
  pointer-events: none;
  /* Stroke width needs no override at either size, unlike the icon this
     replaces: it is a fraction of the 24-unit viewBox, so the 0.4 in the
     markup scales with the glyph instead of having to be re-set per size. */
  transition: opacity 0.45s ease;
  /* Behind the card's own content but still in front of its background: a
     negative index paints beneath in-flow children and above the background of
     the stacking context it sits in, and .skill-face is one of those now that
     each face carries a transform. This is what lets .skill-row drop the
     z-index it used to need — see the note there. */
  z-index: -1;
}

/* The row still has to clear the ghost mark — the glyph is 186px tall against a
   card that floors at 134px, so near that floor it reaches the row, and the
   stacking should not be left to source order. What changed is which of the two
   moves. This row used to carry `z-index: 1` to lift itself above an
   absolutely-positioned mark; the mark now sits at `z-index: -1` instead and
   the row stays where it is in flow.

   Swapped because of what the z-index cost on WebKit. A z-index on a flex item
   makes it a stacking context, and WebKit promotes that to a layer of its own —
   one that escapes the backface culling of the .skill-face above it. So on a
   flipped card the front's category name and chevron went on painting through
   the back, mirrored, while the rest of the front face was correctly hidden.
   Every other engine culled the whole subtree together.

   Nothing here needs a stacking context of its own now, so there is none to
   promote. Note that the row still must not become positioned:
   .skill-toggle::after is absolutely positioned and resolves against
   .skill-face to stretch the button's hit area over the whole card, and a
   positioned row would capture it and shrink that target to the row. */
.skill-row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
}

/* The rule is what gives the heading a floor to sit on — without it the name
   and chevron float in the lower half with nothing holding them. */
/* margin-top is what pins the pair to the bottom now that the icon tile is
   gone — the row is the front's only in-flow child, and space-between has
   nothing left to space it against. */
.skill-row--front {
  margin-top: auto;
  padding-top: 1rem;
}

/* The button is this row's only child now, so space-between has nothing to
   space it against and would park it on the left. It belongs under the one on
   the front face, which is where the thumb already is. */
.skill-row--back {
  margin-top: auto;
  justify-content: flex-end;
}

.skill-name {
  font-family: theme('fontFamily.display');
  font-size: clamp(18px, 1.35vw, 22px);
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.015em;
  text-wrap: balance;
}

/* No position of its own — the ::after below resolves against .skill-face
   instead, which is what stretches the hit area to the whole card. */
.skill-toggle {
  display: inline-flex;
  height: 34px;
  width: 34px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  border: 1px solid theme('colors.hair');
  color: theme('colors.steel');
  transition: background-color 0.25s ease, color 0.25s ease;
}

.skill-toggle::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 22px;
}

/* Warms on the same hover that shifts the ghost, so the button and the mark
   behind it move together rather than as two separate reactions. */
.skill-card:hover .skill-toggle,
.skill-toggle:focus-visible {
  background: theme('colors.paper-soft');
  color: theme('colors.accent-text');
}

.skill-chev {
  height: 17px;
  width: 17px;
  /* CSS rotation is clockwise, so -90deg swings the down-chevron's apex from
     bottom to right. One path serves both faces. */
  transform: rotate(-90deg);
}

.skill-chev--back {
  transform: rotate(90deg);
}

/* On the white face `accent-text` measures 5:1 at 11px, so the label can carry
   the accent here in a way it could not on the tints. */
.skill-label {
  font-family: theme('fontFamily.data');
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: theme('colors.accent-text');
}

.skill-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  list-style: none;
}

/* The chips are the payload the flip exists to reveal — the only one, now —
   so they carry ink while the label above them stays a step back. */
.skill-chip {
  border-radius: 9999px;
  border: 1px solid theme('colors.hair');
  background: theme('colors.paper-soft');
  padding: 0.2rem 0.6rem;
  font-family: theme('fontFamily.data');
  font-size: 11.5px;
  line-height: 1.5;
  color: theme('colors.ink');
}

@media (prefers-reduced-motion: reduce) {
  .skill-toggle,
  .skill-ghost {
    transition: none;
  }
}
</style>
