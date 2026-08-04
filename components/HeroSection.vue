<script setup lang="ts">
import { gsap } from 'gsap'
import { useBallPerch } from '~/composables/useScrollBall'

const wrapRef = ref<HTMLElement | null>(null)
const trackRef = ref<HTMLElement | null>(null)
const markRef = ref<HTMLElement | null>(null)
const introRef = ref<HTMLElement | null>(null)

// The bio, cut into runs so the two concrete claims in it — the stack and the
// brands — can carry the accent while the prose around them stays ink. Two
// highlights rather than one: they are the only load-bearing facts in the
// sentence, and colouring the adjectives instead would be decoration.
const INTRO_SEGMENTS: { text: string; accent?: boolean }[] = [
  { text: 'Frontend / UI Developer working in' },
  { text: 'Vue.js and React.js.', accent: true },
  {
    text:
      '10+ years shipping automotive and enterprise platforms across the Middle East and Africa, including the Vue.js CMS component library built for'
  },
  { text: "Nissan and Ford's", accent: true },
  { text: 'regional sites.' }
]

// One span per word is what the scroll wipe animates. Flattened at module
// scope rather than in the template so the markup stays a single v-for.
const INTRO_WORDS = INTRO_SEGMENTS.flatMap((segment) =>
  segment.text.split(' ').map((word) => ({ word, accent: !!segment.accent }))
)

// The ball's home. It sits centred on the mark — `from` and `to` are the same
// point — so it is carried by the heading as that slides left rather than
// rolling along a 9vw rule, which at this length would be a twitch. The
// rotation it picks up is real: it comes from the mark travelling under it.
//
// The window runs from the very top of the page, so the ball is already in the
// headline before a single pixel of scroll. It ends well short of the hero's
// own end for a concrete reason: the mark travels a full viewport left, and by
// the hero's last third it has carried the ball off the left edge of the
// screen. Leaving after ~1.35 screens drops the ball while it is still in
// frame, and lands it near the left end of the rule it falls onto.
//
// Expressed as an offset from the start rather than as a fraction of the
// trigger: `bottom-=55%` reads as "earlier" and is not — it moves the viewport
// marker, which pushes the end *later*.
useBallPerch(() => markRef.value, {
  trigger: () => wrapRef.value,
  start: 'top top',
  end: () => `+=${Math.round(window.innerHeight * 1.35)}`,
  from: 0.5,
  to: 0.5,
  inset: 0
})

// Horizontal gutter of the pinned frame (px-5 / md:px-8), doubled because
// the track has to clear the padding on both the entry and exit side.
const GUTTER = 32

let mm: gsap.MatchMedia | null = null

onMounted(() => {
  if (!import.meta.client || !wrapRef.value) return

  // Intro, sequenced on one timeline. The reminder has to land only once the
  // heading has finished rising, and a hand-tuned delay would silently drift
  // out of sync the moment any duration or stagger below is touched — so the
  // heading's real end is captured as a label and the reminder hangs off it.
  const intro = gsap.timeline({ delay: 0.15 })

  // Both stacked copies start at position 0 so the ghost and the ink layer
  // rise in lockstep — staggering them relative to each other would offset
  // the two and smear the wipe on the first frame.
  wrapRef.value.querySelectorAll('.hero-layer').forEach((layer) => {
    const lines = layer.querySelectorAll('.hero-line')
    gsap.set(lines, { yPercent: 110 })
    intro.to(lines, { yPercent: 0, duration: 0.9, ease: 'power4.out', stagger: 0.08 }, 0)
  })

  // Nothing else has been added yet, so the timeline's current end is exactly
  // the moment the heading settles.
  intro.addLabel('headingDone')

  // Guarded: the bio moved out of the pinned frame into its own block, so on
  // any build where the remaining .hero-fade elements are commented out this
  // is an empty NodeList and GSAP would warn about a targetless tween.
  const fades = wrapRef.value.querySelectorAll('.hero-fade')
  if (fades.length) {
    intro.from(
      fades,
      { opacity: 0, y: 16, duration: 0.8, ease: 'power2.out', stagger: 0.1 },
      0.35
    )
  }

  // The reminder reads as a footnote on the h1, so it must not arrive before
  // the line it annotates has landed.
  intro.from(
    wrapRef.value.querySelectorAll('.hero-slogan'),
    { opacity: 0, y: 12, duration: 0.7, ease: 'power2.out' },
    'headingDone'
  )

  // Everything below is the pinned horizontal read, and it only exists on
  // desktop for visitors who haven't asked for reduced motion. matchMedia
  // reverts the whole block — tweens, ScrollTriggers and inline styles —
  // the moment the query stops matching, so a resize past the breakpoint
  // leaves the static layout genuinely untouched.
  mm = gsap.matchMedia()

  mm.add('(min-width: 768px) and (prefers-reduced-motion: no-preference)', () => {
    // The intro's scroll wipe. The dimmed state is written here rather than in
    // CSS for the same reason the heading's clip is: if this never runs — no
    // JS, or reduced motion — the paragraph stays plainly readable instead of
    // sitting at 16% opacity forever.
    //
    // Inside the query, not outside it, because the scrub window is a fixed
    // slice of the section's own height and on a phone that section is ~410px
    // tall. The wipe never got to finish: half the bio sat at 16% opacity at
    // rest, which is the one paragraph on the page that has to be read.
    const words = introRef.value?.querySelectorAll('.hero-word')
    if (words?.length) {
      gsap.fromTo(
        words,
        { opacity: 0.16 },
        {
          opacity: 1,
          // Linear, because the scrub already maps this to the scrollbar — an
          // ease here would fight the user's own scroll velocity.
          ease: 'none',
          // Overlapping rather than sequential: at a stagger shorter than the
          // duration, several words are mid-brighten at once, which reads as a
          // wave washing along the line instead of a cursor stepping word by
          // word.
          duration: 1,
          stagger: 0.45,
          scrollTrigger: {
            trigger: introRef.value,
            start: 'top 82%',
            // Finishes above the midline, so the last word lands while the
            // paragraph is still comfortably in frame rather than as it leaves.
            end: 'bottom 58%',
            scrub: 0.5
          }
        }
      )
    }

    const wrap = wrapRef.value
    const track = trackRef.value
    if (!wrap || !track) return

    // Measured, never hardcoded: the heading's width follows a fluid font
    // size, so the travel distance is only knowable at runtime. offsetWidth
    // (rather than getBoundingClientRect) because it ignores the transform
    // GSAP is applying to this very element.
    const distance = () => Math.max(0, track.offsetWidth - window.innerWidth + GUTTER * 2)

    // One shared config: the heading slides and fills from the same scrub,
    // so the ink can never drift out of step with the travel.
    const scrollTrigger = {
      trigger: wrap,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.5,
      invalidateOnRefresh: true
    }

    gsap.fromTo(
      track,
      { x: 0 },
      { x: () => -distance(), ease: 'none', scrollTrigger }
    )

    // The real <h1> is revealed over the grey ghost underneath it. The
    // starting clip is set here rather than in CSS on purpose: if this
    // script never runs, the heading stays plainly visible instead of
    // being clipped to nothing.
    gsap.fromTo(
      track.querySelector('.hero-ink'),
      { clipPath: 'inset(0 100% 0 0)' },
      { clipPath: 'inset(0 0% 0 0)', ease: 'none', scrollTrigger }
    )
  })
})

onUnmounted(() => {
  mm?.revert()
})
</script>

<template>
  <!--
    Scroll spacer. Its height is what the pinned frame is scrubbed against:
    three viewports of scrolling drive one screen of horizontal travel.
    Below `md` it collapses to auto and the hero is an ordinary block.
  -->
  <div ref="wrapRef" class="md:h-[300vh]">
    <!--
      `position: sticky` does the pinning, not ScrollTrigger's `pin: true`.
      Same approach the reference uses, and it keeps GSAP from injecting a
      pin-spacer element into the DOM. `overflow-hidden` sits on the sticky
      element itself — putting it on an ancestor would break sticky outright.
    -->
    <header
      class="hero-frame relative overflow-hidden pt-[130px] pb-10 max-md:flex max-md:flex-col max-md:justify-center md:sticky md:top-0 md:flex md:h-screen md:flex-col md:justify-center md:py-0"
    >
      <!-- <p
        class="hero-fade mb-7 flex items-center gap-2.5 px-5 font-data text-[13px] tracking-wide text-steel md:absolute md:left-0 md:top-[130px] md:mb-0 md:px-8"
      >
        <span class="h-[7px] w-[7px] rounded-full bg-accent" aria-hidden="true" />
        DUBAI, UAE — UAE RESIDENCE VISA (EMPLOYED)
      </p> -->

      <!--
        Lifted off dead centre. The frame is `justify-center`, which puts the
        heading's optical middle below the viewport's — the slogan and the
        wordmark both sit under it and pull the composition down. The transform
        rather than padding: it moves the mark's rect, so the ball riding it
        comes up with the heading instead of detaching from it.
      -->
      <div class="w-full px-5 md:-translate-y-[6vh] md:px-8">
        <!--
          Both copies of the heading occupy the same grid cell so they stack
          pixel-for-pixel. `md:w-max` lets the row shrink-wrap its nowrap
          content and grow past the viewport — that overflow is the thing
          the scroll then travels through.
        -->
        <div ref="trackRef" class="relative grid md:w-max md:will-change-transform">
          <!--
            Rendered twice from one block of markup rather than written out
            twice: the wipe only lines up while the two layers are identical,
            and a single source makes drifting apart impossible.
          -->
          <component
            :is="layer === 'ink' ? 'h1' : 'div'"
            v-for="layer in ['ghost', 'ink']"
            :key="layer"
            :aria-hidden="layer === 'ghost' ? 'true' : undefined"
            class="hero-layer col-start-1 row-start-1 flex flex-wrap items-center gap-x-[0.25em] font-display font-black uppercase leading-[0.92] tracking-tight text-[clamp(44px,9.5vw,148px)] md:flex-nowrap md:gap-x-[4vw] md:text-[clamp(80px,12vw,210px)]"
            :class="
              layer === 'ghost'
                ? 'hidden text-hair md:flex motion-reduce:!hidden'
                : 'hero-ink text-ink'
            "
          >
            <span class="block overflow-hidden">
              <span class="hero-line block">Frontend</span>
            </span>

            <!--
              The punctuation between the two halves of the heading: a
              hairline the page's ball rests on. The orange rotor that used to
              sit above it is gone — the ball is that mark now, and it leaves
              at the end of the hero rather than spinning in place. Sized in
              `em` so it tracks the fluid heading, and `bg-current` means the
              rule darkens along with the wipe. Hidden on mobile, where the
              heading wraps and there is no row to punctuate.

              Only the ink layer's rail is registered as a perch; the ghost
              copy underneath is a pixel-for-pixel duplicate, so either would
              give the same rect, and one of them has to win.
            -->
            <span
              class="hero-mark hidden shrink-0 flex-col justify-end md:flex md:w-[9vw]"
              aria-hidden="true"
            >
              <span
                :ref="layer === 'ink' ? (el) => (markRef = el as HTMLElement) : undefined"
                class="block h-px w-full bg-current opacity-25"
              />
            </span>

            <span class="block overflow-hidden">
              <span class="hero-line block">
                /
                <em
                  class="not-italic"
                  :class="layer === 'ghost' ? 'text-accent/20' : 'text-accent'"
                >UI</em>
                Developer
              </span>
            </span>
          </component>
        </div>
      </div>

      <!--
        The reminder. Kept at label size on purpose: it reads as a footnote
        on the job title above it rather than competing as a second headline,
        which is also why the mark is a plain asterisk — in mono it sits
        raised, exactly like a footnote reference. Same `Design ◆ that matter`
        construction as the reference, just quiet. Sits opposite the aside on
        the same bottom edge; falls back into flow under the heading on mobile.
      -->
      <p
        class="hero-slogan mt-8 flex items-center gap-2.5 px-5 font-data text-[13px] uppercase tracking-wide md:absolute md:bottom-[3vw] md:left-0 md:mt-0 md:px-8"
      >
        Develop
        <span class="text-accent" aria-hidden="true">*</span>
        <span class="text-steel">it's necessary</span>
      </p>

      <!--
        Mobile only. On desktop the hero is a pinned horizontal read that ends
        on a screen of deliberate air, and a pair of buttons in it would be
        clutter. On a phone there is no such read — the hero is a title card,
        and without these the first way to make contact is the footer, ten
        thousand pixels down. Verbs, not labels: each says what happens.
      -->
      <div class="hero-cta mt-9 flex flex-wrap items-center gap-2.5 px-5 md:hidden">
        <a
          href="mailto:shejin.abu@gmail.com"
          class="inline-flex min-h-[46px] items-center rounded-full bg-ink px-5 font-data text-[13px] text-paper transition-colors hover:bg-accent-text"
        >
          Email me
        </a>
        <a
          href="/files/Shejin-Abu-CV.pdf"
          download
          class="inline-flex min-h-[46px] items-center rounded-full border border-hair px-5 font-data text-[13px] text-ink transition-colors hover:border-ink"
        >
          Download CV
        </a>
      </div>
    </header>
  </div>

  <!--
    The bio, out of the pinned frame's bottom corner and onto its own screen.
    At 26–46px centred it is a statement rather than a caption, which is what
    the scroll wipe needs to be worth doing — the effect is invisible on a
    15px paragraph parked in a corner.
  -->
  <section ref="introRef" class="hero-intro" aria-label="Introduction">
    <p class="hero-intro-copy">
      <!--
        One span per word, because the wipe brightens them individually. The
        wrapper carries the accent class rather than the words carrying colour
        inline, so the reveal's opacity and the segment's colour stay
        independent — a highlighted word dims and brightens exactly like the
        ink around it.
      -->
      <span
        v-for="(item, i) in INTRO_WORDS"
        :key="`${i}-${item.word}`"
        class="hero-word"
        :class="{ 'hero-word--accent': item.accent }"
      >{{ item.word }}</span>
    </p>
  </section>
</template>

<style scoped>
/* Mobile only — above md the frame is `h-screen` and pinned, and this would
   be arguing with it. At 343px the hero filled 40% of a phone and stopped,
   which read as a page that had not finished loading rather than as a title
   card. Not a Tailwind arbitrary value because it needs the vh fallback
   underneath it: `svh` is the small viewport, so the composition holds while
   iOS's URL bar is expanded instead of being cropped by it. */
@media (max-width: 767px) {
  .hero-frame {
    min-height: 86vh;
    min-height: 86svh;
  }
}

/* Asymmetric, because what sits above and below is not symmetric. The pinned
   frame already ends on a screen's worth of air — the heading is lifted 6vh
   off centre, so the bottom of the hero is empty — and stacking a 14vh pad on
   top of that read as a gap rather than as breathing room. The lower pad stays
   larger: below it is Projects, which starts straight into its own heading. */
.hero-intro {
  padding: clamp(1.5rem, 4vh, 3rem) 0 clamp(3.5rem, 9vh, 6.5rem);
}

.hero-intro-copy {
  margin: 0 auto;
  max-width: 1080px;
  padding: 0 1.25rem;
  text-align: center;
  font-family: theme('fontFamily.display');
  font-size: clamp(26px, 3.2vw, 46px);
  /* Not the 900 the h1 runs at. This is a paragraph read at heading size, and
     at black weight it would compete with the wordmark above it. */
  font-weight: 500;
  line-height: 1.28;
  letter-spacing: -0.02em;
  text-wrap: pretty;
}

/* inline-block is what lets each word take its own opacity while still
   wrapping as normal text. The margin replaces the collapsed whitespace
   between spans, in `em` so it tracks the fluid size. */
.hero-word {
  display: inline-block;
  margin-right: 0.24em;
}

/* `accent-text` (#CC3D10, 5:1) rather than `accent` (#FF4A1F, 3.4:1). At this
   size 3:1 would pass, but the paragraph starts dimmed and 3.4:1 has nothing
   left to give once opacity comes off it. */
.hero-word--accent {
  color: theme('colors.accent-text');
}
</style>
