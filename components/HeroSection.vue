<script setup lang="ts">
import { gsap } from 'gsap'
import { useBallPerch } from '~/composables/useScrollBall'

const wrapRef = ref<HTMLElement | null>(null)
const trackRef = ref<HTMLElement | null>(null)
const markRef = ref<HTMLElement | null>(null)
const introRef = ref<HTMLElement | null>(null)
const sloganRef = ref<HTMLElement | null>(null)

// The bio, cut into runs so the two concrete claims in it — the stack and the
// brands — can carry the accent while the prose around them stays ink. Two
// highlights rather than one: they are the only load-bearing facts in the
// sentence, and colouring the adjectives instead would be decoration.
const INTRO_SEGMENTS: { text: string; accent?: boolean }[] = [
  { text: 'Frontend / UI Developer working in' },
  { text: 'Vue.js and React.js.', accent: true },
  {
    text:
      '10+ years shaping enterprise and automotive platforms across the'
  },
  { text: 'Middle East and Africa regions.', accent: true },
  //{ text: "Nissan, Ford and INFINITI.", accent: true }
]

// One span per word is what the scroll wipe animates. Flattened at module
// scope rather than in the template so the markup stays a single v-for.
const INTRO_WORDS = INTRO_SEGMENTS.flatMap((segment) =>
  segment.text.split(' ').map((word) => ({ word, accent: !!segment.accent }))
)

// The slogan, typed out one character at a time under the bio. Its spacing
// lives inside the strings rather than between the spans on purpose: Vue
// condenses whitespace in the template, and a swallowed space would knock the
// caret a full character out of line with the text it is supposed to trail.
const SLOGAN_SEGMENTS: { text: string; class?: string }[] = [
  { text: 'Develop' },
  { text: ' * ', class: 'text-accent' },
  { text: "it's necessary", class: 'text-steel' }
]

// The typewriter advances in discrete character steps, so the step count has
// to be derived from the string. Hardcoding it would desync the caret from the
// text the first time a word here changes.
const SLOGAN_LENGTH = SLOGAN_SEGMENTS.reduce((total, s) => total + s.text.length, 0)

// Where along the frame the mark has to still be when it hands the ball over.
// Wide enough to clear TheScrollBall's own FADE_PX band at the left edge, so
// the ball leaves the headline at full strength rather than as a sliver, with
// the floor covering the narrowest viewport the journey runs at.
const HERO_LEAVE_X = () => Math.max(0.2 * window.innerWidth, 210)

// And how far left the *fall* may still be dragged by the mark after that.
//
// The hop launches from wherever the mark currently is, which is what carries
// the ball's leftward roll into the air instead of stopping it dead at the
// handover. It works because the mark is normally still in frame — but the mark
// travels `track.offsetWidth - innerWidth + gutter*2`, and the narrower the
// viewport the larger that is relative to the frame: at 1280×800 it is 1176px
// in a 1280px frame, so the mark finishes at x=-119 and took the ball with it,
// off the edge at zero opacity for 240px of scroll. Held here, the follow-
// through survives and the launch point simply stops when the mark has nothing
// left to give.
const HERO_HOLD_X = () => Math.max(0.09 * window.innerWidth, 120)

// How far the phone's ball turns across the hero's pinned read — see .hero-orb.
//
// It stays where it is put and only spins, so this is a rate rather than a
// consequence: there is no surface travelling under it to derive a rotation
// from, the way the scroll ball derives one from the distance it has rolled.
//
// A turn and a half over ~66vh of scroll. Enough that a flick produces obvious
// movement — the whole point, since a ball that turns imperceptibly is the idle
// loop this replaced — and little enough that the poles stay readable as poles
// instead of smearing into a band.
//
// Negative, because that is the direction everything else in this frame is
// going: the headline slides left for the whole of the same window, and a ball
// turning the other way reads as fighting it.
const ORB_SPIN = -540

/**
 * The scroll at which the mark's centre reaches HERO_LEAVE_X, as a ScrollTrigger
 * end offset. Re-invoked on every refresh, so a resize re-resolves it.
 *
 * Every term is measured off the same elements the slide itself is measured off
 * — see `distance` in the pinned read below — because the slide is what this is
 * describing. offsetWidth/offsetLeft rather than getBoundingClientRect for the
 * usual reason: they ignore the transform GSAP has on the track, so this reads
 * the untransformed layout whatever the page has scrolled to.
 */
const heroPerchEnd = () => {
  const wrap = wrapRef.value
  const track = trackRef.value
  const mark = markRef.value
  const frame = wrap?.querySelector<HTMLElement>('.hero-frame')
  const pad = wrap?.querySelector<HTMLElement>('.hero-pad')
  if (!wrap || !track || !mark || !frame || !pad) return `+=${Math.round(window.innerHeight)}`

  const scrub = Math.max(1, wrap.offsetHeight - frame.offsetHeight)
  const gutter = parseFloat(getComputedStyle(pad).paddingLeft) || 0
  const distance = Math.max(1, track.offsetWidth - window.innerWidth + gutter * 2)
  // The track is the mark's offsetParent (it is the `relative` box), and it
  // starts flush with the gutter, so this is the mark's centre before the
  // slide has moved it.
  const startX = gutter + mark.offsetLeft + mark.offsetWidth / 2
  // Floored, so a viewport wide enough that the mark never reaches the leave
  // point still gives the ball a headline to ride rather than no window at all.
  const frac = gsap.utils.clamp(0.35, 1, (startX - HERO_LEAVE_X()) / distance)
  return `+=${Math.round(scrub * frac)}`
}

// The ball's home. It sits centred on the mark — `from` and `to` are the same
// point — so it is carried by the heading as that slides left rather than
// rolling along a 9vw rule, which at this length would be a twitch. The
// rotation it picks up is real: it comes from the mark travelling under it.
//
// The window runs from the very top of the page, so the ball is already in the
// headline before a single pixel of scroll. It ends well short of the hero's
// own end for a concrete reason: the mark travels a full viewport left, and by
// the hero's last third it has carried the ball off the left edge of the
// screen.
//
// One screen, not the 1.35 this used to be. The mark reaches the left edge at
// almost exactly a screen of scroll, and the extra third bought nothing but a
// dead stretch: measured, the ball spent 350px of scroll parked at x=1 — a
// sliver at 13% opacity, pinned against the edge, not rolling, while the page
// went on scrolling underneath it. Ending here drops the ball while the mark
// is still in frame, which is what the fall is supposed to launch from, and
// hands those 350px to the fall onto the rule below instead.
//
// Expressed as an offset from the start rather than as a fraction of the
// trigger: `bottom-=55%` reads as "earlier" and is not — it moves the viewport
// marker, which pushes the end *later*.
//
// And derived rather than declared, because "a screen of scroll" is not what
// this end is about. What it is about is the mark reaching the left edge, and
// how much scroll that takes is set by the mark's travel — a fluid heading
// width against the viewport — which no fraction of viewport *height* tracks.
// One screen was right at 1920×1080 and wrong at 1280×800, where the same rule
// rode the ball to x=-75 and held it off-screen at zero opacity for 400px of
// scroll before the fall had even started. Below is the scroll at which the
// mark's centre reaches HERO_LEAVE_X, from the same geometry the scrub itself
// is measured against, so the two cannot drift apart.
useBallPerch(() => markRef.value, {
  trigger: () => wrapRef.value,
  start: 'top top',
  end: heroPerchEnd,
  from: 0.5,
  to: 0.5,
  inset: 0,
  // The fall off the mark is the longest crossing on the page and the only one
  // that has to clear a whole section — the bio and the slogan sit between the
  // headline and Selected Work's rule — so it is the one perch that has to ask
  // for more than the ball's default rather than less. Every other use of
  // `fall` on the site shortens a hop; this one lengthens it.
  //
  // Left at the default 0.3vh it got 324px of scroll to cover ~1100px of
  // descent. Measured at 1920×1080: the ball accelerated to 2.5px of drop per
  // px of scroll, hit the cap that stops a fall aiming below the frame, then
  // jumped 540px in a single frame onto a rule that was still 500px under the
  // fold — and stayed invisible for the next ~600px of scroll while that rule
  // climbed into view. The cap is written on the assumption that a perch's
  // window opens once its surface is in frame; the run from here to the
  // experience chart is scroll-tight enough that layout() was handing the rule
  // over ~620px before its own `top 88%` said to, which is what breaks that
  // assumption.
  //
  // 1.3 is not a free choice. The document gap from the mark to that rule is
  // ~1760px and the ball starts the fall not quite half a screen down, so it
  // has ~560px of frame to descend through — which fixes the scroll at no less
  // than 1200px if the landing is to happen in frame at all, and a little more
  // than that if it is to happen clear of the bottom fade band. Crossings are
  // paid before rolls, so it comes out of the slack the rolls in between
  // declared on top of what they need, not out of how much of any surface the
  // ball rides: measured after, every `ride` in the run is still 1.
  fall: 1.3,
  // Live, and only floored — not pinned. Stating a fixed exit here would stop
  // the ball's leftward roll dead at the handover, a 1.34px/px roll becoming a
  // 0.27px/px drift between one frame and the next. Tracking the mark keeps the
  // follow-through; the floor keeps it in frame. See HERO_HOLD_X.
  exitX: () => {
    const mark = markRef.value
    if (!mark) return HERO_HOLD_X()
    const r = mark.getBoundingClientRect()
    return Math.max(r.left + r.width / 2, HERO_HOLD_X())
  },
  // Measured against the sticky frame rather than the viewport, which is what
  // makes it a constant: while the frame is pinned its own top is 0 and this is
  // just the mark's height on screen; once it unpins both tops fall together
  // and the difference is unchanged. So it answers "how high was the ball when
  // it left the headline" at any scroll position, including the ones long past
  // the point the headline itself has gone.
  exitY: () => {
    const mark = markRef.value
    const frame = wrapRef.value?.querySelector('.hero-frame')
    if (!mark) return 0
    const top = mark.getBoundingClientRect().top
    return frame ? top - frame.getBoundingClientRect().top : top
  }
})

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

  // Everything below is the pinned horizontal read, and it only exists on
  // desktop for visitors who haven't asked for reduced motion. matchMedia
  // reverts the whole block — tweens, ScrollTriggers and inline styles —
  // the moment the query stops matching, so a resize past the breakpoint
  // leaves the static layout genuinely untouched.
  mm = gsap.matchMedia()

  // The slogan types itself out when it scrolls up into view. Not gated on
  // `md` like the block below it — this one is a line of text rather than a
  // pinned read, and it works the same at any width — but still inside a
  // reduced-motion query, because a caret marching across the line is exactly
  // the kind of thing that query exists to switch off. Without it the CSS
  // leaves the slogan fully typed and the caret hidden.
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    const slogan = sloganRef.value
    const ink = slogan?.querySelector<HTMLElement>('.hero-slogan-ink')
    const caret = slogan?.querySelector<HTMLElement>('.hero-slogan-caret')
    if (!slogan || !ink || !caret) return

    // One step per character. In IBM Plex Mono every glyph has the same
    // advance, so an evenly stepped clip lands precisely on glyph boundaries
    // and the caret — stepped over the same duration — sits exactly at the
    // edge of the character that just appeared.
    const ease = `steps(${SLOGAN_LENGTH})`
    const duration = SLOGAN_LENGTH * 0.055

    gsap
      .timeline({
        scrollTrigger: {
          trigger: slogan,
          start: 'top 88%',
          // Types once. A retrigger on every scroll-back would turn a
          // deliberate flourish into a tic.
          once: true
        }
      })
      // Solid, not blinking, while the characters land — the blink is what
      // the caret does when it is waiting, and during the type it isn't.
      .call(() => caret.classList.add('is-live'))
      .fromTo(
        ink,
        { clipPath: 'inset(0 100% 0 0)' },
        { clipPath: 'inset(0 0% 0 0)', duration, ease },
        0
      )
      // Measured in a function so a font swap or resize before the trigger
      // fires can't leave the caret typing to a stale width.
      .fromTo(caret, { x: 0 }, { x: () => ink.offsetWidth, duration, ease }, 0)
      .call(() => caret.classList.add('is-resting'))

    // matchMedia reverts tweens and inline styles on its own, but it has no
    // way to know about the two classes above — without this, turning on
    // reduced motion mid-session would leave a caret blinking at the start of
    // a line that is already fully typed.
    return () => caret.classList.remove('is-live', 'is-resting')
  })

  mm.add('(min-width: 768px) and (prefers-reduced-motion: no-preference)', () => {
    // The intro's scroll wipe. The dimmed state is written here rather than in
    // CSS for the same reason the heading's clip is: if this never runs — no
    // JS, or reduced motion — the paragraph stays plainly readable instead of
    // sitting at 16% opacity forever.
    //
    // Gated on `md`, and the gate is about proportion, not about whether the
    // window is long enough to finish. It is: from the paragraph's top at 82%
    // of the viewport to its bottom at 58% measures `0.24 × viewport +
    // paragraph height`, ~570px on a phone, and the wipe does land.
    //
    // What breaks is what the reader sees on the way there. Every word starts
    // at 16%, and the paragraph is set at heading size — on a 390px screen it
    // is ~360px of a 844px viewport, so it enters the frame nearly blank and
    // is still part-dim once it is centred. Dim text at the head of a section
    // does not read as an effect, it reads as empty space, and this is the one
    // paragraph on the page that has to be read. Above `md` the same paragraph
    // is a much smaller share of the frame and the stagger reads as the wave
    // it is meant to be.
    //
    // Removing this gate on the theory that the window was the problem puts
    // the blank band straight back. It has been tried.
    const copy = introRef.value?.querySelector<HTMLElement>('.hero-intro-copy')
    const words = copy?.querySelectorAll('.hero-word')
    if (!copy || !words?.length) return

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
          // The paragraph, not the section around it. The slogan below it
          // is part of that section, so triggering on the section would
          // stretch this window by the slogan's height and leave the last
          // words of the bio still dim well past the point they are read.
          trigger: copy,
          start: 'top 82%',
          // Finishes above the midline, so the last word lands while the
          // paragraph is still comfortably in frame rather than as it leaves.
          end: 'bottom 58%',
          scrub: 0.5
        }
      }
    )
  })

  // The pinned horizontal read, at every width. It used to be `md` and up, and
  // the phone got a static title card instead — a wrapped two-line heading that
  // filled a screen and then just sat there.
  //
  // Nothing here is width-aware, and that is deliberate: the phone runs the
  // identical timeline, and the only thing that differs is how much scroll it
  // is scrubbed against. That lives in one place — the spacer's height in the
  // template, 166vh against the desktop's 200vh — so the read is the same
  // motion, quicker to get through on the phone. Putting the difference in a
  // second JS branch instead would be two timelines to keep in step.
  //
  // What matters is the spacer minus the frame, since that difference is what
  // the scrub is mapped over: 100vh of pinned scroll on desktop, ~66vh on the
  // phone. Raising the spacer does not slow the slide down so much as stretch
  // the same travel over more wheel, which is what reads as dead scroll.
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    const wrap = wrapRef.value
    const track = trackRef.value
    // The padded element, not the frame: the gutter moved onto this when the
    // frame stopped carrying horizontal padding of its own.
    const pad = wrap?.querySelector<HTMLElement>('.hero-pad')
    const frame = wrap?.querySelector<HTMLElement>('.hero-frame')
    if (!wrap || !track || !pad || !frame) return

    // Read off the element rather than hardcoded. The gutter is px-5 on a phone
    // and md:px-8 above it, and the track has to clear it on both the entry and
    // the exit side — one constant was right for exactly one of the two widths,
    // which is fine while only that width ran this and isn't any more. Called
    // per refresh, so crossing the breakpoint re-resolves it.
    const gutter = () => parseFloat(getComputedStyle(pad).paddingLeft) || 0

    // Measured, never hardcoded: the heading's width follows a fluid font
    // size, so the travel distance is only knowable at runtime. offsetWidth
    // (rather than getBoundingClientRect) because it ignores the transform
    // GSAP is applying to this very element.
    const distance = () => Math.max(0, track.offsetWidth - window.innerWidth + gutter() * 2)

    // One shared config: the heading slides and fills from the same scrub,
    // so the ink can never drift out of step with the travel.
    //
    // The end used to be `bottom bottom`, which is the scroll position where
    // the spacer's foot meets the viewport's — i.e. `+=(spacer − viewport)`.
    // That is the right moment only while the frame is exactly a viewport
    // tall, because what actually ends the read is the frame *unsticking*, and
    // a sticky element does that when the spacer's foot meets its own foot:
    // `+=(spacer − frame)`. The two agree at 100vh and diverge by the
    // difference otherwise — a frame shorter than the screen would finish its
    // slide and then sit pinned and motionless for the remainder, which is the
    // dead scroll you feel rather than see.
    //
    // Written against the measured elements so it stays true at both widths;
    // `invalidateOnRefresh` re-resolves it when the breakpoint is crossed.
    const scrollTrigger = {
      trigger: wrap,
      start: 'top top',
      end: () => `+=${Math.max(1, wrap.offsetHeight - frame.offsetHeight)}`,
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

  // The phone's ball, spinning. What it replaces was a CSS keyframe loop, and
  // the complaint about that one is exactly right: it hopped at 1.5s whatever
  // the page was doing, so it was the one thing in the hero that did not answer
  // to the scrollbar. Everything around it — the slide, the ink, the ball on
  // desktop — is scrubbed, and a loop next to that reads as a spinner.
  //
  // The ball itself does not move. It holds the middle of the frame for the
  // whole of the pinned read and only turns, which is what the read is: the
  // heading travels a viewport and a half across a ball that stays put. Give
  // the ball a path of its own and there are two things moving past each other
  // and no fixed point to read either against.
  //
  // Scrubbed against the same window as the slide, and at the same 0.5, so the
  // two are smoothed identically and the ball stops turning on the same frame
  // the heading runs out of travel. Below `md` only: the real scroll ball takes
  // the job over from 1024px up, and between the two there is no gap to fill.
  mm.add('(max-width: 767px) and (prefers-reduced-motion: no-preference)', () => {
    const wrap = wrapRef.value
    const frame = wrap?.querySelector<HTMLElement>('.hero-frame')
    const spin = wrap?.querySelector<HTMLElement>('.hero-orb-spin')
    if (!wrap || !frame || !spin) return

    // Only the spin layer, never the ball. The ball carries the `translateX`
    // that centres it on its CSS `left`, and the sphere's own shading has to
    // stay put while the marks on top of it turn — light does not orbit with a
    // ball. See .hero-orb-spin.
    gsap.fromTo(
      spin,
      { rotation: 0 },
      {
        rotation: ORB_SPIN,
        ease: 'none',
        scrollTrigger: {
          trigger: wrap,
          start: 'top top',
          // The slide's own end, written out again rather than shared: the
          // block above resolves it inside its own matchMedia scope.
          end: () => `+=${Math.max(1, wrap.offsetHeight - frame.offsetHeight)}`,
          scrub: 0.5,
          invalidateOnRefresh: true
        }
      }
    )
  })
})

onUnmounted(() => {
  mm?.revert()
})
</script>

<template>
  <div ref="wrapRef" class="hero-scroll h-[166vh] md:h-[200vh]">
    <header
      class="hero-frame sticky top-0 flex h-screen flex-col justify-center overflow-hidden pt-[70px] md:pt-0"
    >
      <div class="hero-pad w-full px-5 md:-translate-y-[6vh] md:px-8">
        <div class="hero-orb md:hidden" aria-hidden="true">
          <span class="hero-orb-ball"><span class="hero-orb-spin" /></span>
        </div>

        <div ref="trackRef" class="hero-track relative grid w-max will-change-transform">
          <component
            :is="layer === 'ink' ? 'h1' : 'div'"
            v-for="layer in ['ghost', 'ink']"
            :key="layer"
            :aria-hidden="layer === 'ghost' ? 'true' : undefined"
            class="hero-layer col-start-1 row-start-1 flex flex-nowrap items-center gap-x-[6vw] font-display font-black uppercase leading-[0.92] tracking-tight text-[clamp(52px,16vw,110px)] motion-reduce:flex-wrap motion-reduce:gap-x-[0.25em] md:gap-x-[4vw] md:text-[clamp(80px,12vw,210px)]"
            :class="
              layer === 'ghost'
                ? 'flex text-hair motion-reduce:!hidden'
                : 'hero-ink text-ink'
            "
          >
            <span class="block overflow-hidden">
              <span class="hero-line block">Frontend</span>
            </span>

            <span
              class="hero-mark flex w-[14vw] shrink-0 flex-col justify-end md:w-[9vw]"
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

      <div class="hero-cta top-[6em] flex flex-wrap items-center gap-2.5 px-5 md:hidden">
        <a
          href="mailto:shejin.abu@gmail.com"
          class="inline-flex min-h-[46px] items-center rounded-full bg-ink px-5 font-data text-[13px] text-paper transition-colors hover:bg-accent-text"
        >
          Email me
        </a>
        <a
          href="/files/ShejinAbu-26.pdf"
          download="Shejin-Abu-CV.pdf"
          class="inline-flex min-h-[46px] items-center rounded-full border border-hair bg-paper px-5 font-data text-[13px] text-ink transition-colors hover:border-ink"
        >
          Download CV
        </a>
      </div>
    </header>
  </div>

  <section ref="introRef" class="hero-intro" aria-label="Introduction">
    

    <p class="hero-intro-copy">
      <span
        v-for="(item, i) in INTRO_WORDS"
        :key="`${i}-${item.word}`"
        class="hero-word"
        :class="{ 'hero-word--accent': item.accent }"
      >{{ item.word }}</span>
    </p>

            <p ref="sloganRef" class="hero-slogan">
      <span class="hero-slogan-line">
        <span class="hero-slogan-ink"><span
          v-for="(segment, i) in SLOGAN_SEGMENTS"
          :key="i"
          :class="segment.class"
        >{{ segment.text }}</span></span>
        <span class="hero-slogan-caret" aria-hidden="true" />
      </span>
    </p>


  </section>
</template>

<style scoped>
/* Mobile only. The frame itself is left at the template's `h-screen`; what is
   set here is what the phone puts in the half of that screen the headline does
   not use.

   This used to be a 50svh frame, on the reasoning that a full screen holds one
   line of heading and a button row — about 140px — and 700px of air is a gap
   wherever it is put. The reasoning was sound and the conclusion was wrong,
   because a frame shorter than the viewport cannot fill it while pinned: for
   `spacer − frame` of scrolling there was nothing under the headline but the
   spacer, up to 66vh of it, and the bio only closed the distance on the very
   last frame of the pin. The gap moved, it did not go.

   A full screen has the opposite property: while the frame is pinned it *is*
   the viewport, so there is no scroll position at which anything empty can show
   underneath it. The air is then inside a composition rather than between two
   of them, which is the whole difference — a centred heading with the ball
   behind it reads as placed on a field, where the same heading with a strip of
   spacer under it reads as having run out. 100vh rather than svh on purpose:
   svh is the height with the URL bar out, so on the taller layout the frame
   would come up short and hand back a strip of the spacer, which is the bug
   this is fixing. Overshooting instead only crops the air below the ball.

   The spacer moves with it: the pinned scrub is `spacer − frame` (see
   `scrollTrigger` in <script>), so 116vh over a 50svh frame and 166vh over a
   full one are the same ~66vh of slide. Change one without the other and the
   heading's travel speeds up or slows down. */
@media (max-width: 767px) {
  /* The box the ball is centred on. .hero-track inside it is already
     `relative`, so this changes nothing about the slide — it only gives the
     absolutely placed ball a containing block that is the heading's own row
     rather than the whole frame, which is what keeps the two centred on each
     other at any height. */
  .hero-pad {
    position: relative;
  }

  /* And this is the other half of that: the ball is centred on the heading and
     is taller than it, so its foot reaches ~20px into the button row below.
     Positioning .hero-pad above makes it a positioned box, and positioned boxes
     paint after in-flow ones whatever the DOM order — so without this the ball
     covers the top of both buttons. `relative` with no offset puts .hero-cta
     back in front of it on the strength of coming later. */
  .hero-cta {
    position: relative;
  }

  /* The section's usual opening pad, halved. The hero closes on a screen of
     air either way; above `md` this is left alone, because there the pinned
     frame is the only thing separating the two. */
  .hero-intro {
    padding-top: 1rem;
  }
}

/* Centred on the heading's row, in both axes, and behind it.

   Vertically on .hero-pad rather than on the frame: the heading is centred in a
   flex column whose contents and padding both change with the viewport, so the
   frame's middle and the heading's middle are not the same point and only one
   of them is the one the ball has to agree with.

   Horizontally on the viewport, which means it holds still while the track
   slides across it. That is the whole read — the type travels, the ball does
   not — and it is also why the ball is not anchored to anything inside the
   track: the track's own middle is a viewport and a half wide and leaves the
   frame entirely. */
.hero-orb {
  position: absolute;
  top: 50%;
  left: 50%;
  pointer-events: none;
}

/* Centred on that point rather than hung off an edge, so the ball stays on the
   heading's midline whatever the clamp below resolves to.

   The position is CSS's alone. Nothing in <script> writes to this element, so
   the ball is where it belongs whether or not the script ever runs, and the
   scrub has one property on one layer to think about.

   Same stops as .scroll-ball, so the phone's ball and the desktop's are
   recognisably one object rather than two oranges. */
.hero-orb-ball {
  position: absolute;
  top: 0;
  left: 0;
  width: clamp(140px, 44vw, 190px);
  height: clamp(140px, 44vw, 190px);
  border-radius: 9999px;
  transform: translate(-50%, -50%);
  background: radial-gradient(circle at 34% 28%, #ffa877, #ff7c3e 40%, #e8551c 76%, #c6420f);
  box-shadow: 0 26px 44px -24px rgba(198, 66, 15, 0.6);
}

/* A soft accent bloom a little under three times the ball's width, which is
   what stops the sphere reading as a hard disc pasted behind the type and lets
   it sit in the page as light instead. */
.hero-orb-ball::before {
  content: '';
  position: absolute;
  inset: -70%;
  border-radius: inherit;
  background: radial-gradient(circle, rgba(255, 124, 62, 0.17), rgba(255, 124, 62, 0) 62%);
}

/* The sphere's shading is fixed — light does not orbit with the ball — so the
   rotation lives on this layer, and needs marks on it to be legible at all. Two
   soft poles read as a rolling ball; a bare gradient reads as one sliding.
   Same idea as .scroll-ball-spin, for the same reason.

   Not the same figures, though, and the difference is the whole of what a mark
   at this size has to answer for. That ball is 46px and its poles are a hard
   17% disc, which at that scale is a dot. This one is 172px — nearly four times
   across — and the identical proportions came out as two 30px craters with a
   cut edge, which reads as a texture on the ball rather than as the ball
   turning. Smaller against the sphere and faded rather than cut: enough to
   carry a turn and a half, not enough to be looked at.

   This layer is the only thing the scrub touches, which is why the will-change
   is here and not on the ball — see ORB_SPIN. */
.hero-orb-spin {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background:
    radial-gradient(circle at 50% 15%, rgba(139, 44, 8, 0.22) 0 7%, rgba(139, 44, 8, 0) 18%),
    radial-gradient(circle at 50% 85%, rgba(139, 44, 8, 0.22) 0 7%, rgba(139, 44, 8, 0) 18%);
  will-change: transform;
}

/* Specular highlight, above the spinning layer and deliberately outside it. */
.hero-orb-ball::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: radial-gradient(circle at 33% 25%, rgba(255, 255, 255, 0.5), transparent 45%);
}

/* No pinned read here, so everything that only exists to serve one is dead
   weight: the spacer is a screen and a half of empty scrolling, and the track
   is a nowrap heading clipped to whatever fits — which is "Frontend" and
   nothing else. Unwinding it back to an ordinary block is the whole fallback.

   This was already the case above `md` and had no answer: the spacer height
   and the sticky frame were plain CSS while the timeline that used them was
   behind a `no-preference` query, so a desktop visitor with reduced motion on
   got three viewports of a stuck, half-clipped headline. It only became
   visible once the phone started running the same markup. */
@media (prefers-reduced-motion: reduce) {
  .hero-scroll {
    height: auto;
  }

  .hero-frame {
    position: static;
    height: auto;
    padding-top: 130px;
    padding-bottom: 2.5rem;
  }

  .hero-pad {
    transform: none;
  }

  .hero-track {
    width: 100%;
  }

  /* Nothing to punctuate once the heading wraps to two lines. */
  .hero-mark {
    display: none;
  }

  /* And nothing to fill: with the frame unpinned and sized to its contents
     there is no half-screen of air under the headline. Left in, it would be
     positioned 15vh off the foot of a box that is now only as tall as the
     heading, i.e. on top of it. */
  .hero-orb {
    display: none;
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

.hero-slogan {
  display: flex;
  justify-content: center;
  margin: clamp(1.75rem, 4.5vh, 3.25rem) 0 0;
  padding: 0 1.25rem;
  color: theme('colors.ink');
}

/* Shrink-wraps the text so the caret, which is positioned against this box,
   has a right edge to travel to. The line as a whole is what gets centred —
   the type itself still runs left to right inside it, which is why the
   composition doesn't slide sideways as characters land. */
.hero-slogan-line {
  position: relative;
  display: inline-flex;
}

.hero-slogan-ink {
  font-family: theme('fontFamily.data');
  font-size: clamp(15px, 1.9vw, 24px);
  text-transform: uppercase;
  /* Uniform across every glyph, so it stretches the monospace grid without
     breaking it — the stepped clip still lands on character boundaries. */
  letter-spacing: 0.06em;
  /* `pre`, not `nowrap`: the spaces that separate the three segments are
     load-bearing here. Collapsing one would shorten the grid the caret is
     stepping along. */
  white-space: pre;
}

/* Hidden until the typewriter claims it, so the line reads as finished text
   rather than as a stalled prompt when the animation never runs. */
.hero-slogan-caret {
  position: absolute;
  left: 0;
  top: 0.1em;
  bottom: 0.1em;
  width: 2px;
  background: theme('colors.accent');
  opacity: 0;
}

.hero-slogan-caret.is-live {
  opacity: 1;
}

/* Only once the last character has landed. A caret that blinks while it is
   still typing reads as a rendering fault rather than as a cursor. The
   animation overrides `.is-live`'s opacity by cascade, so both classes stay
   on the element. */
.hero-slogan-caret.is-resting {
  animation: hero-caret-blink 1.1s steps(1) infinite;
}

@keyframes hero-caret-blink {
  0%,
  50% {
    opacity: 1;
  }
  50.01%,
  100% {
    opacity: 0;
  }
}
</style>
