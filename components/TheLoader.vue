<script setup lang="ts">
import { markPageReady } from '~/composables/usePageReady'

/**
 * The loading screen. "here we go" over a paper field, with the ellipsis
 * animated, and then it lifts.
 *
 * Rendered by default rather than switched on after hydration, so it is in the
 * served HTML and covers the first paint. Mounted after the fact it would
 * arrive *over* a page the reader had already seen, which is the one thing a
 * loader must never do.
 */

/** In the DOM at all. False only once the fade has finished. */
const visible = ref(true)
/** Fading. Drives the opacity transition; the element is still there. */
const leaving = ref(false)

/**
 * How long it stays up at a minimum.
 *
 * On a warm cache `load` fires in under 100ms and without a floor the loader is
 * a single flashed frame — worse than no loader, because a flash reads as a
 * glitch rather than as a wait. 900ms is long enough to read two words and
 * short enough not to be a toll booth on every visit.
 */
const MIN_MS = 900

/**
 * How long it stays up at most, measured from mount.
 *
 * `load` waits on every image, stylesheet and font on the page, and any one of
 * them hanging would otherwise leave the reader looking at two words forever.
 * This is the answer to that: past here the page is revealed whether or not it
 * finished arriving. It is the same reason `markPageReady` is called on the way
 * out rather than on success — a page that is late is still a page, and the
 * intros behind this must not be hostage to a stalled request.
 */
const MAX_MS = 4000

/** Matches the CSS transition below. Both have to change together. */
const FADE_MS = 600

onMounted(() => {
  const started = performance.now()
  let done = false

  // Scrolling under the loader would run the page's scroll-driven work behind
  // it and reveal a page halfway through itself. Blocked here rather than with
  // `overflow: hidden` on <html>: this page is built on ScrollTrigger, which
  // measures the document on load, and taking the scrollbar away underneath it
  // while it measures is how every end position on the page ends up wrong.
  // Cancelling the gestures touches no layout at all.
  const block = (e: Event) => e.preventDefault()
  const opts = { passive: false } as const
  window.addEventListener('wheel', block, opts)
  window.addEventListener('touchmove', block, opts)

  const lift = () => {
    if (done) return
    done = true

    window.removeEventListener('wheel', block)
    window.removeEventListener('touchmove', block)

    leaving.value = true

    // Released as the fade *starts*, not after it. The hero's headline takes
    // most of a second to rise and the fade takes 0.6, so overlapping them
    // means the reader watches the page assemble through the last of the
    // loader. Held to the end instead, the overlay clears onto a blank hero
    // that only then begins to move, and the join is visible.
    markPageReady()

    window.setTimeout(() => {
      visible.value = false
    }, FADE_MS)
  }

  const finish = () => {
    if (done) return
    window.setTimeout(lift, Math.max(0, MIN_MS - (performance.now() - started)))
  }

  // Fonts as well as `load`, because the display face here and the headline
  // behind it are the same family. Revealed before Archivo has arrived, the
  // hero rises in the fallback and re-flows to the real cut a moment later —
  // the swap happens either way, and this is what keeps it under the overlay
  // instead of in the reader's first second of the page.
  const settled = Promise.all([
    document.readyState === 'complete'
      ? Promise.resolve()
      : new Promise<void>((res) => window.addEventListener('load', () => res(), { once: true })),
    // Guarded: `document.fonts` is absent in a handful of older engines, and a
    // missing font API is not a reason to never show the page.
    document.fonts?.ready ?? Promise.resolve()
  ])

  settled.then(finish)
  window.setTimeout(lift, MAX_MS)
})
</script>

<template>
  <!-- The `<noscript>` that hides this whole thing when scripting is off lives
       in nuxt.config's head, not here. Vue's compiler rejects a `<style>` in a
       client template outright — "tags with side effect are ignored" — and it
       is right to: the tag has to be in the *served* HTML to be any use, and a
       template that only runs once JS has run is the one place it cannot be.
       See the `noscript` entry in nuxt.config.ts. -->
  <div
    v-if="visible"
    class="loader"
    :class="{ 'loader--leaving': leaving }"
    role="status"
    aria-live="polite"
  >
    <p class="loader-line">
      here we go<span class="loader-dots" aria-hidden="true"
        ><span class="loader-dot">.</span><span class="loader-dot">.</span
        ><span class="loader-dot">.</span></span
      >
    </p>
  </div>
</template>

<style scoped>
.loader {
  position: fixed;
  inset: 0;
  /* Over the skip link at 200, which is the highest thing on the page. */
  z-index: 300;
  display: flex;
  align-items: center;
  justify-content: center;
  background: theme('colors.paper');
  opacity: 1;
  transition: opacity 600ms ease;
}

/* Lifted rather than dissolved in place: the page behind is already at rest,
   so the only motion left to give the exit is the overlay's own. Nudging it up
   as it goes reads as a curtain; fading alone reads as a stall that ended. */
.loader--leaving {
  opacity: 0;
  transform: translateY(-1.5%);
  transition:
    opacity 600ms ease,
    transform 600ms cubic-bezier(0.4, 0, 0.2, 1);
  /* Nothing is clickable through a fading overlay unless it is told to be. */
  pointer-events: none;
}

.loader-line {
  font-family: theme('fontFamily.display');
  font-weight: 900;
  /* Tracks the hero headline's own clamp rather than picking a size: these two
     are the first and second things the reader sees, half a second apart. */
  font-size: clamp(34px, 6vw, 76px);
  line-height: 1;
  letter-spacing: -0.02em;
  color: theme('colors.ink');
}

/* The dots are their own element so the ellipsis can animate without the words
   moving. Inline-block on each, because opacity is cheap and a transform on an
   inline box does nothing. */
.loader-dots {
  display: inline-block;
  color: theme('colors.accent');
}

.loader-dot {
  display: inline-block;
  animation: loader-dot 1.25s ease-in-out infinite;
}

/* 0.14s apart, so the three read as one travelling pulse rather than three
   independent blinks. Wider than this and it is a countdown. */
.loader-dot:nth-child(2) {
  animation-delay: 0.14s;
}

.loader-dot:nth-child(3) {
  animation-delay: 0.28s;
}

/* Held down for more than half the cycle, so there is a rest between passes.
   Ramped evenly, the pulse never stops and the line reads as jittering.

   Floors at 0.2 rather than 0: a dot that leaves entirely takes the ellipsis
   apart three times a second, and the shape of "..." is the point. */
@keyframes loader-dot {
  0%,
  55%,
  100% {
    opacity: 0.2;
    transform: translateY(0);
  }
  28% {
    opacity: 1;
    transform: translateY(-0.12em);
  }
}

/* No `prefers-reduced-motion` gate, matching the rest of the site — see
   BALL_QUERY in composables/useScrollBall.ts. The reveal is not gated on the
   animation either way: `lift` runs on a timer and a load event, so a reader
   who never sees the dots move waits exactly as long as everyone else. */
</style>
