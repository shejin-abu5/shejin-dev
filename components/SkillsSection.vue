<script setup lang="ts">
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useReveal } from '~/composables/useReveal'
import { BALL_QUERY, useBallPerch } from '~/composables/useScrollBall'

/*
  The section used to be nine flip cards, each with a category name on the front
  and a chip list on the back. It is now a lattice of tool marks that swap
  themselves out. The old component is kept verbatim at SkillsSection-card.vue
  rather than in git alone, because the two are different enough that diffing
  them is not how anyone would want to read the previous design.

  What the change buys: the card grid asked to be worked through — nine names,
  nine clicks, fifty-odd chips — to answer a question most visitors ask in about
  a second ("what does he actually build with?"). A wall of logos answers it
  without being read at all.
*/

/**
 * Every mark in assets/img/tools, keyed by filename.
 *
 * Globbed rather than listed so adding a tool is one file plus one string in
 * POOLS below — no import to remember. `?url` hands back Vite's hashed asset
 * URL, and since all twenty of these are under 11kB Vite inlines most of them
 * as data URIs at build time, so the lattice costs no extra requests.
 *
 * The path is relative rather than `~/assets/...`: Vite resolves glob patterns
 * statically at build time, and a relative literal is the form that needs no
 * alias resolution to do it.
 */
const ICON = import.meta.glob<string>('../assets/img/tools/*.svg', {
  eager: true,
  query: '?url',
  import: 'default'
})

const iconUrl = (name: string) => ICON[`../assets/img/tools/${name}.svg`]

/** Filename → how the tool is actually written, for the screen-reader list. */
const LABEL: Record<string, string> = {
  vue: 'Vue.js',
  nuxt: 'Nuxt',
  react: 'React',
  typescript: 'TypeScript',
  javascript: 'JavaScript',
  html5: 'HTML5',
  css: 'CSS3',
  tailwindcss: 'Tailwind CSS',
  sass: 'SASS',
  gsap: 'GSAP',
  vite: 'Vite',
  pinia: 'Pinia',
  nodejs: 'Node.js',
  git: 'Git',
  github: 'GitHub',
  figma: 'Figma',
  postman: 'Postman',
  claude: 'Claude',
  cursor: 'Cursor',
  docker: 'Docker'
}

interface Cell {
  /** Zero-indexed position in the 5×5 lattice. */
  row: number
  col: number
  /** The marks this one slot cycles through. Empty means a blank tile. */
  pool: string[]
}

/*
  A 5×5 checkerboard: a tile sits only where `row + col` is odd, which is twelve
  of the twenty-five squares. That is the shape the reference uses, and the
  reason it reads as scattered rather than as a grid with holes punched in it —
  no tile ever shares an edge with another, so there is no run of two to suggest
  a row.

  Three of the twelve stay empty, all on the left edge. They are what stops the
  lattice reading as a solid block, and they sit on the side the footballer is
  on, so he gets clear space beside him for free.

  Listed in reading order. Placement is explicit via grid-area so the order here
  changes nothing about where they land — but the reveal below staggers in DOM
  order, so keeping the two in step is what makes the entry sweep down the
  lattice instead of jumping around it.

  Pools are grouped by kind, so a slot reads as one shelf rather than as a
  random draw: the frameworks tile is always showing a framework. Twenty marks
  across nine slots.

  Nineteen of the twenty marks come from svgl.app and are the real thing. GSAP
  is hand-set — svgl carries no GSAP logo, and GSAP is the one library here the
  site is visibly built out of, so leaving it off the wall was the worse of the
  two options. Its wordmark is drawn with <text> rather than paths, and the font
  stack in that file is a stack rather than a webfont on purpose: an <img> loads
  the SVG into an isolated document that cannot reach this page's @font-face
  rules, so an unresolvable family would fall back to a serif.
*/
const CELLS: Cell[] = [
  { row: 0, col: 1, pool: [] },
  { row: 0, col: 3, pool: ['vue', 'nuxt', 'react'] },
  { row: 1, col: 0, pool: [] },
  { row: 1, col: 2, pool: ['typescript', 'javascript'] },
  { row: 1, col: 4, pool: ['html5', 'css'] },
  { row: 2, col: 1, pool: ['tailwindcss', 'sass'] },
  { row: 2, col: 3, pool: ['gsap', 'vite'] },
  { row: 3, col: 0, pool: [] },
  { row: 3, col: 2, pool: ['pinia', 'nodejs'] },
  { row: 3, col: 4, pool: ['git', 'github'] },
  { row: 4, col: 1, pool: ['figma', 'postman'] },
  { row: 4, col: 3, pool: ['claude', 'cursor', 'docker'] }
]

/** Flat, alphabetised, for the visually-hidden list that carries the real content. */
const ALL_TOOLS = CELLS.flatMap((c) => c.pool)
  .map((name) => LABEL[name] ?? name)
  .sort((a, b) => a.localeCompare(b))

/**
 * The average gap between swaps. Actual gaps are this jittered ±28%, and some
 * ticks fire a burst — see `tick`.
 *
 * Quick enough that the lattice reads as working rather than as a slideshow,
 * and still slow enough to stay out of the footballer's way: he is juggling a
 * few hundred pixels to the left of it through the whole pin.
 */
const BLINK_MS = 1100

/** Which mark each cell is currently showing, as an index into its own pool. */
const step = ref<number[]>(CELLS.map(() => 0))

/**
 * Cells with something to swap to. A one-mark pool is a legal thing to write in
 * CELLS and simply never flips, so it must not be picked or the timer spends
 * ticks doing nothing visible.
 */
const LIVE = CELLS.map((c, i) => (c.pool.length > 1 ? i : -1)).filter((i) => i >= 0)

/*
  Every cell starts on index 0 and the first swap is chosen on the client, which
  is what keeps this safe under SSG: the server and the first client render
  agree exactly, so there is nothing for hydration to reconcile. Seeding the
  indices randomly would render a different lattice on each side and throw a
  mismatch on every load.
*/

/**
 * The flip layers, one per cell — the element GSAP rotates.
 *
 * A plain array rather than a ref: these are only ever read inside the timer,
 * so making them reactive would cost a re-render per cell on mount for nothing.
 */
const flips: (HTMLElement | null)[] = []

function setFlip(el: unknown, i: number) {
  flips[i] = (el as HTMLElement | null) ?? null
}

/**
 * One tile turning over.
 *
 * The trick in the middle is the `set` to -90. A tile rotated to 180deg is
 * showing its own back, and everything on it — the mark especially — is
 * mirrored; rotating 0→180 and stopping would leave every logo backwards. At
 * exactly 90deg the tile is edge-on and occupies no width, so jumping from +90
 * to -90 there is invisible, and the second half carries on turning the same
 * way and lands at 0. The eye reads one continuous half-turn; the element never
 * renders past edge-on in either direction.
 *
 * The mark is swapped at that same instant, behind the edge, which is what
 * makes the flip feel like it is *revealing* the new tool rather than
 * cross-dissolving to it.
 *
 * `--lift` peaks with the turn and drives the tile's shadow, so the tile's
 * ground shadow spreads as it comes off the page — the same device the flip
 * cards this section replaced used, at a twelfth of the size.
 */
function flipCell(i: number) {
  const pool = CELLS[i].pool
  const next = (step.value[i] + 1) % pool.length
  const el = flips[i]

  if (!el) {
    step.value[i] = next
    return
  }

  gsap
    .timeline({ defaults: { overwrite: 'auto' } })
    .to(el, { rotationY: 90, duration: 0.26, ease: 'power2.in' }, 0)
    .to(el, { '--lift': 1, duration: 0.26, ease: 'power2.in' }, 0)
    .add(() => {
      step.value[i] = next
    })
    .set(el, { rotationY: -90 })
    .to(el, { rotationY: 0, duration: 0.36, ease: 'power3.out' })
    .to(
      el,
      {
        '--lift': 0,
        duration: 0.36,
        ease: 'power3.out',
        // Handing --lift back to the stylesheet at rest is what lets the CSS
        // hover state own it again; an inline 0 would outrank the hover rule
        // forever after the first flip.
        onComplete: () => el.style.removeProperty('--lift')
      },
      '<'
    )
}

const latticeRef = ref<HTMLElement | null>(null)
let io: IntersectionObserver | null = null

let running = false
let timer: ReturnType<typeof setTimeout> | null = null
/** Burst members waiting their turn, held so `stop` can cancel them mid-flight. */
const pending: ReturnType<typeof setTimeout>[] = []
let last = -1

function tick() {
  timer = null

  /*
    Most ticks turn one tile. Roughly one in four turns two or three, 130ms
    apart, and that is the whole difference between a lattice that is alive and
    one that is a metronome: a fixed interval turning a fixed number of tiles is
    a clock, and the eye locks onto a clock within about three beats and stops
    seeing it. Bursts and the jitter below give it an irregular pulse there is
    no pattern to learn.
  */
  const burst = Math.random() < 0.26 ? 2 + Math.floor(Math.random() * 2) : 1
  const chosen: number[] = []

  for (let n = 0; n < burst; n++) {
    // Never the same cell twice running, and never twice inside one burst.
    const pool = LIVE.filter((i) => i !== last && !chosen.includes(i))
    if (!pool.length) break

    const i = pool[Math.floor(Math.random() * pool.length)]
    chosen.push(i)
    last = i

    if (n === 0) flipCell(i)
    else pending.push(setTimeout(() => flipCell(i), n * 130))
  }

  schedule()
}

function schedule() {
  // ±28%, so consecutive gaps are audibly different lengths.
  timer = setTimeout(tick, BLINK_MS * (0.72 + Math.random() * 0.56))
}

function start() {
  if (running) return
  running = true
  schedule()
}

function stop() {
  running = false
  if (timer) clearTimeout(timer)
  timer = null
  pending.forEach(clearTimeout)
  pending.length = 0
}

const sectionRef = ref<HTMLElement | null>(null)
const railRef = ref<HTMLElement | null>(null)

/**
 * How much scroll the section is held for while he keeps the ball up.
 *
 * Short, and deliberately shorter than the other pins on the page: this is one
 * trick on a loop, so it needs long enough to read as juggling — three or four
 * touches — and no longer. The perches below are struck against the same two
 * constants, which is what stops the ball leaving while he is still working.
 */
const PIN_SCROLL = 620

/**
 * Where the section comes to rest, and it is not flush with the top of the
 * frame.
 *
 * The heading block is centred against the lattice now, so he sits nearer the
 * middle of the section than he used to and this number is doing less work than
 * it once did. It stays because the ball he is keeping up rises above his head,
 * and 140px of clearance is what keeps the top of that arc out of the ball's own
 * top fade band (FADE_PX, 190px) at short viewport heights.
 */
const PIN_START = 'top top+=140'

/** The player's own contact surface — resolved out of his SVG once mounted. */
const playerRef = ref<HTMLElement | null>(null)
const touchRef = computed<HTMLElement | null>(
  () => (playerRef.value?.querySelector('.p-touch') as HTMLElement | null) ?? null
)

/**
 * The roll down the rule to his boot.
 *
 * Struck against the *section* rather than against the rule, which is the one
 * substantive change the redesign forced on the ball. The rule used to sit just
 * under the heading near the top of the section; in the split it sits inside a
 * column that is centred against a 470px lattice, which drops it about 350px
 * further down. Every window expressed as "the rule reaches N% of the viewport"
 * therefore moved with it, and `end: 'top 8%'` — already tuned to land just
 * before the pin — ended up landing several hundred pixels *after* it.
 *
 * Against the section the two are the same clock: `end` is literally PIN_START,
 * so the roll finishes at the instant the section comes to rest and he takes
 * over. That is what the old `top 8%` was reaching for by hand.
 */
useBallPerch(() => railRef.value, {
  trigger: () => sectionRef.value,
  start: 'top 92%',
  end: PIN_START,
  // The rule is half the width it was — one column, not the full container —
  // so these are re-struck to keep the roll the same *length in pixels* rather
  // than the same fraction. A roll is paid for at a fixed speed, so its pixel
  // length is what decides how long it takes: 0.68→0.9 across 1176px was 259px
  // of travel, and 0.44→0.9 across 556px is 256px. Same roll, same pace, on a
  // rule half as long.
  from: 0.44,
  // Unchanged, and still the number that matters most: this is where he is
  // sitting, so the roll ends at his boot rather than at the end of the rule.
  to: 0.9,
  // Sideways, because Education's hairline is most of a viewport and a half
  // below with the whole lattice in between — see the long note on the boot
  // perch below, which now owns this exit.
  fall: 0.1
})

/**
 * His feet, while he keeps the ball up.
 *
 * The surface is a rect inside the player that traces the ball's arc, animated
 * on the same timeline that alternates his feet — so the ball rises and falls
 * because the thing it is perched on does, and it meets a boot each time it
 * comes down. See `.p-touch` in ThePlayer.vue.
 *
 * `from` and `to` are the same point: he is keeping it up on the spot, not
 * carrying it anywhere. All the movement is the surface's.
 */
useBallPerch(() => touchRef.value, {
  trigger: () => sectionRef.value,
  start: PIN_START,
  end: `+=${PIN_SCROLL}`,
  from: 0.5,
  to: 0.5,
  inset: 0,
  /*
    Off the right edge of the frame and back in at the left, rather than an arc.

    Both ends of a fall are read live, and over a gap this long the departure
    point does not merely move, it leaves: the section climbs a full screen out
    of frame at the page's own speed while Education is still coming up from
    below. An arc anchored to whichever dominates ran the ball off the top of
    the screen, hung it there, then brought it down at roughly twice scroll
    speed to make up the difference. Sideways, there is no departure point left
    to be dragged by.
  */
  side: true
})

let pinMedia: ReturnType<typeof gsap.matchMedia> | null = null

onMounted(() => {
  useReveal(sectionRef.value)

  /*
    The lattice only ticks while it is on screen. It is an unprompted, endless
    animation — the one kind this site has that nobody asked for by scrolling or
    clicking — so leaving it running behind five other sections would be burning
    a timer and a paint for something nobody can see. The margin starts it just
    before it arrives, so the first swap is never the thing that announces it.
  */
  if (latticeRef.value) {
    io = new IntersectionObserver(
      ([entry]) => (entry.isIntersecting ? start() : stop()),
      { rootMargin: '120px' }
    )
    io.observe(latticeRef.value)
  }

  pinMedia = gsap.matchMedia()

  /**
   * Holds the section still while he keeps the ball up.
   *
   * Without it the trick happens on a section travelling past at the page's own
   * speed, and the ball leaves with it. A pin fixes both halves at once: the
   * ground stops moving, and the scroll it absorbs is scroll the ball spends on
   * his feet rather than scroll the section spends leaving.
   *
   * Gated on BALL_QUERY — below it there is no ball, no player, and nothing to
   * hold the page for.
   */
  pinMedia.add(BALL_QUERY, () => {
    const el = sectionRef.value
    if (!el) return

    const st = ScrollTrigger.create({
      trigger: el,
      start: PIN_START,
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
  stop()
  io?.disconnect()
  pinMedia?.revert()
})
</script>

<template>
  <section id="skills" ref="sectionRef" class="py-12 md:py-[120px]">
    <div class="mx-auto max-w-[1240px] px-5 md:px-8">
      <div class="skills-split">
        <div class="reveal">
          <span class="mb-3.5 block font-data text-[13px] tracking-wide text-accent-text">03 — Stack</span>
          <h2 class="font-display text-[clamp(30px,4.5vw,58px)] font-black uppercase leading-none tracking-tight">
            Skills
          </h2>

          <!-- Facing right, and unflipped, because this is the one handoff on
               the page where the ball genuinely leaves: Skills hands over
               sideways, off the right edge of the frame and back in at the left
               for Education. So the overhead kick is aimed the way the ball is
               actually going — and in the split it now aims at the lattice,
               which is the thing the section is about. -->
          <div class="relative mt-8">
            <span ref="railRef" class="hidden h-px w-full bg-hair md:block" aria-hidden="true" />

            <div
              ref="playerRef"
              class="pointer-events-none absolute -bottom-1.5 right-[8%] hidden w-[var(--cameo)] lg:block"
            >
              <ThePlayer move="skills" />
            </div>
          </div>

          <p class="mt-7 max-w-[38ch] text-[15px] leading-relaxed text-steel md:text-base">
            The tools I reach for day to day — the front-end frameworks, the
            styling and motion layer on top of them, and the AI stack I now build
            with.
          </p>
        </div>

        <!-- Decorative in the literal sense: what it shows changes every 1.4s,
             so anything reading it linearly would get an arbitrary snapshot of
             nine of the twenty. The complete list follows as real text. -->
        <div ref="latticeRef" class="lattice" aria-hidden="true">
          <div
            v-for="(cell, i) in CELLS"
            :key="`${cell.row}-${cell.col}`"
            class="reveal s-cell"
            :style="{ gridArea: `${cell.row + 1} / ${cell.col + 1}` }"
          >
            <div :ref="(el) => setFlip(el, i)" class="s-flip">
              <div class="s-tile" :class="{ 's-tile--empty': !cell.pool.length }">
                <!--
                  No `:key`, deliberately. A key would remount the element on
                  every swap; binding `src` alone patches the attribute in place,
                  which is what lets the mark change instantly behind the tile's
                  edge mid-flip instead of tearing down and rebuilding a node
                  the flip is in the middle of rotating.
                -->
                <img
                  v-if="cell.pool.length"
                  class="s-mark"
                  :src="iconUrl(cell.pool[step[i]])"
                  alt=""
                  decoding="async"
                >
              </div>
            </div>
          </div>
        </div>

        <ul class="sr-only">
          <li v-for="tool in ALL_TOOLS" :key="tool">{{ tool }}</li>
        </ul>
      </div>
    </div>
  </section>
</template>

<style scoped>
.skills-split {
  display: grid;
  gap: 3rem;
}

/* The split is the lg-and-up presentation, which is the same line the ball, the
   player and the pin live on (BALL_QUERY). Below it everything stacks: heading,
   rule, copy, then the lattice centred underneath. */
@media (min-width: 1024px) {
  .skills-split {
    grid-template-columns: 1fr 1fr;
    /* Centred, not top-aligned. The lattice is the taller of the two columns by
       some way, and a heading pinned to its top edge leaves the copy stranded
       against three rows of empty space. This is also what moves the rule down
       the section — see the roll's note in the script. */
    align-items: center;
    gap: 4rem;
  }
}

.lattice {
  /*
    The tile is the section's unit and everything else is struck off it, so the
    lattice scales as one object rather than as five numbers kept in agreement
    by hand.

    This is the below-lg value, where the lattice has the full container to
    itself. It is much larger than the lg one and that is not a mistake: sized
    at the split's 6vw, five tiles came to 296px adrift in a 756px container at
    tablet widths, which read as a stamp in the middle of an empty page. The
    tile tracks the width it actually has, and the width it has doubles the
    moment the split collapses.

    The 56px floor is where a brand mark stops being legible — below it Postman
    and Docker are a coloured smudge. The 104px cap is where a tile stops being
    a chip and starts being a card.
  */
  --tile: clamp(56px, 12vw, 104px);
  /*
    Struck off the tile rather than off the viewport, so the ratio holds at
    every size — that ratio is the whole reason the twelve read as one lattice
    instead of as twelve scattered cards. The reference runs about 7.5%.
  */
  --tile-gap: calc(var(--tile) * 0.075);

  position: relative;
  display: grid;
  grid-template-columns: repeat(5, var(--tile));
  grid-template-rows: repeat(5, var(--tile));
  gap: var(--tile-gap);
  /*
    Shrink-wrapped to the five tracks and centred as a block, rather than left
    full-width with `justify-content: center` doing the centring.

    The two look identical until something is measured against the element's own
    box, and the wash below is: its `inset` is a percentage of this element. Full
    width, that box is the whole column — 756px at tablet against 512px of
    actual tiles — so the wash spread half again as wide as the thing it is
    meant to sit under. Shrink-wrapped, the box *is* the tiles, and the wash
    stays proportional at every width without a single number needing to know
    which breakpoint it is in.
  */
  width: max-content;
  margin-inline: auto;
}

/*
  The wrapper's own shadow: one soft blurred wash under all twelve tiles rather
  than twelve shadows that happen to sit near each other.

  Worth saying what this is and is not. Sampled per pixel, the reference has
  pure white in every gap between its tiles — there is no wash behind its
  wrapper at all, only a tight ~4px shadow under each tile. What reads as depth
  there is entirely per-tile. This wash is the deliberate addition: it gives the
  lattice a single ground so the twelve read as one object resting on the page,
  which the reference gets for free from having a much denser arrangement.

  Kept far below the per-tile shadows in strength, because the two compound. At
  0.055 in the centre it is about a fifth of a step of grey at its darkest —
  visible as a softening, not as a grey patch. `inset` is negative so the wash
  falls off well outside the tracks instead of stopping square at the lattice
  edge, which would give the thing it is meant to soften a hard border.

  The alpha ramp has to reach zero *at* the ending shape rather than short of
  it. A gradient whose last stop is transparent at 72% is fully transparent from
  72% out, and that discontinuity is a real edge: at 26px of blur it still read
  as a grey ellipse sitting behind the tiles, which is worse than no wash. The
  0-alpha stop is at 100% now, so the falloff runs the full radius and there is
  no boundary left for the blur to have to hide.

  z-index -1 paints it behind the cells but still in front of the section
  background. The cells are transformed by the reveal, which makes each one a
  stacking context — but they remain in-flow children of this element, so the
  negative layer still resolves beneath them.
*/
.lattice::before {
  content: '';
  position: absolute;
  inset: -20%;
  z-index: -1;
  background: radial-gradient(
    ellipse 70% 70% at 50% 46%,
    rgb(18 18 18 / 0.055) 0%,
    rgb(18 18 18 / 0.03) 35%,
    rgb(18 18 18 / 0.01) 65%,
    rgb(18 18 18 / 0) 100%
  );
  filter: blur(32px);
  pointer-events: none;
}

/* In the split the lattice gets half the container rather than all of it — a
   556px column at the 1240px cap — so the tile is struck off that instead.
   The step down at the breakpoint is real and intended: the box the lattice
   lives in halves at exactly the same line. */
@media (min-width: 1024px) {
  .lattice {
    --tile: clamp(64px, 6vw, 88px);
  }
}

/*
  Three nested elements, and each owns exactly one transform. That is the whole
  reason for the nesting, and it is not fussiness — two of these are animated by
  GSAP, which writes an inline `transform`, and an inline transform beats any
  stylesheet rule for good. Stacked on one element they would silently destroy
  each other:

    .s-cell  — `.reveal`, GSAP's entry y
    .s-flip  — GSAP's rotationY, the swap
    .s-tile  — the CSS hover lift

  Collapsed into one, the reveal's leftover inline transform would kill the
  hover from the first scroll, and the flip would then overwrite both.
*/
.s-cell {
  display: grid;
  /* Shallow enough to be felt. The tile is 86px, so a deep perspective flattens
     the turn into a width animation; this is close enough that the leading edge
     visibly swings toward the viewer. */
  perspective: 620px;
}

.s-flip {
  --lift: 0;
  display: grid;
  transform-style: preserve-3d;
}

/*
  The visual tile is a child of the placed cell rather than the cell itself, and
  the split is load-bearing.

  `.reveal` hands its elements to GSAP, which animates `y` and leaves an inline
  `transform` behind once it lands — `clearProps` in useReveal only releases
  `will-change`. An inline transform outranks any stylesheet rule, so a hover
  lift written on the same element would be silently dead from the first reveal
  onwards. Reveal owns the cell, hover owns the tile, and neither touches the
  other's transform.
*/
.s-tile {
  position: relative;
  display: grid;
  place-items: center;
  border-radius: calc(var(--tile) * 0.21);
  background: theme('colors.paper');
  /*
    Lighter than `hair`, and this is the one place in the section that steps off
    the site's hairline token on purpose.

    `hair` is #E7E5DF — warm, and the right edge for a full-width rule or a
    186px card, where a hairline has length enough to read as a drawn line. On a
    tile this size it is drawn round all four sides of an 86px box, twelve times
    over, and at that density the warmth turns into a beige cast and the weight
    turns the lattice into wire mesh. Measured, the reference runs a neutral
    #E9E9E9 here and lets the shadow do the separating.

    This is `hair` mixed about a third of the way to paper and cooled to match:
    still the site's edge, at the strength twelve small boxes can carry.
  */
  border: 1px solid #EEEDEA;
  /*
    Two shadows doing two jobs. The tight one is the contact shadow — it is what
    the reference has, a ~4px fall from about 3.5% under the bottom edge, and it
    is what makes the tile read as sitting on the page rather than printed on
    it. The wide one is the lift.

    Both are lighter than they were, because the wrapper wash behind them now
    carries part of the depth and the two compound.
  */
  box-shadow:
    0 1px 2px rgb(18 18 18 / 0.045),
    0 calc(4px + var(--lift, 0) * 10px) calc(12px + var(--lift, 0) * 18px)
      rgb(18 18 18 / calc(0.035 + var(--lift, 0) * 0.045));
  transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.3s ease;
}

/*
  The three blanks. Not `opacity`, which is what this wants to be: `.reveal`
  animates opacity 0→1 on the cell above, and a value here would have to survive
  underneath it. A softer fill and a lighter edge get the same recessed reading
  with nothing for GSAP to argue with.

  No shadow at all, which is the part that matters — the reference's blanks have
  none either, and it is the absence of the contact shadow rather than the fill
  that makes them read as holes in the lattice rather than as tiles that happen
  to be empty.
*/
.s-tile--empty {
  background: theme('colors.paper-soft');
  border-color: #F4F3F0;
  box-shadow: none;
}

@media (hover: hover) {
  .s-tile:not(.s-tile--empty):hover {
    transform: translateY(-3px);
    /* The contact shadow stays put while the lift shadow spreads — that split
       is what reads as the tile coming off the page rather than as its shadow
       simply getting darker. */
    box-shadow:
      0 1px 2px rgb(18 18 18 / 0.045),
      0 12px 26px rgb(18 18 18 / 0.08);
  }
}

/*
  Square box, `contain` inside it. The twenty marks arrive at wildly different
  aspect ratios — Nuxt is 256×168, Figma is 54×80 — and sizing on width alone
  would draw the wide ones half again as large as the tall ones. Fitting every
  mark inside the same square is what makes them look like one set.

  44% leaves a comfortable margin at the 88px cap and still reads at the 56px
  floor.
*/
.s-mark {
  position: absolute;
  width: 44%;
  height: 44%;
  object-fit: contain;
}

</style>
