<script setup lang="ts">
import { gsap } from 'gsap'
import { useBallPerch } from '~/composables/useScrollBall'

const footerRef = ref<HTMLElement | null>(null)
const restRef = ref<HTMLElement | null>(null)

// Where the page's ball ends up: it falls the length of the footer, lands on
// the rule above the contact block and hops there for as long as the page
// stays put, instead of dropping out of the frame and leaving the last screen
// of the site with nothing on it. Scrolling back up takes it off this perch
// and into the fall from Languages, unwound exactly as it came.
//
// This rule rather than the footer's top edge. The top edge is the wrong
// surface for a *resting* ball for the same reason it is the right one for a
// falling one: a footer taller than the viewport carries it up out of the
// frame — and under the nav — well before the document runs out, so the ball
// would come to rest somewhere it cannot be seen. This rule sits a couple of
// hundred px above the end of the document, which is to say it is still in
// frame, near the bottom, at every scroll position from which it is reachable
// at all.
//
// `from` and `to` are equal because a resting ball does not roll. It lands
// dead centre and stays there.
useBallPerch(() => restRef.value, {
  // Triggered off the footer's own bottom rather than off the rule, and in
  // viewport-independent terms: 150px before the document runs out, whatever
  // the viewport is — which puts the rule just inside the bottom of the frame
  // as the ball arrives, and 150px further up by the time the page stops.
  //
  // Anchoring to the rule instead would mean a start expressed as a fraction
  // of viewport height, and the rule is only ~210px clear of the document
  // bottom: on a tall viewport any such fraction resolves past the end of the
  // page, and a perch the scroll cannot reach is a ball that never lands.
  trigger: () => footerRef.value,
  start: 'bottom bottom+=150',
  // Well past the end of the document, on purpose. This perch has no exit:
  // the ball is meant to still be on it when the page runs out, so the window
  // has to outlast the scroll rather than hand over to anything.
  end: '+=4000',
  from: 0.5,
  to: 0.5,
  bounce: true
})

onMounted(() => {
  if (!import.meta.client || !footerRef.value) return

  gsap.from(footerRef.value.querySelectorAll('.footer-fade'), {
    opacity: 0,
    y: 24,
    duration: 0.9,
    ease: 'power2.out',
    stagger: 0.15,
    scrollTrigger: {
      trigger: footerRef.value,
      start: 'top 75%'
    }
  })
})
</script>

<template>
  <footer id="contact" ref="footerRef" class="bg-ink py-24 text-paper md:py-[120px]">
    <div class="mx-auto max-w-[1240px] px-5 md:px-8">
      <span class="mb-3.5 block font-data text-[13px] tracking-wide text-accent">
        04 — Get in touch
      </span>

      <h2
        class="footer-fade max-w-[900px] font-display text-[clamp(34px,7vw,96px)] font-black uppercase leading-[0.95] tracking-tight"
      >
        Open to Frontend / UI roles in the UAE.
      </h2>

      <p class="footer-fade mt-6 max-w-[520px] text-[18px] leading-relaxed text-white/60">
        hire me to juggle ⚽
      </p>

      <div class="footer-fade mt-9 flex flex-wrap items-center gap-x-8 gap-y-4">
        <a
          href="mailto:shejin.abu@gmail.com"
          aria-label="Email Shejin Abu at shejin.abu@gmail.com"
          class="inline-flex items-center gap-3.5 border-b border-white/30 pb-1.5 font-data text-lg transition-colors hover:border-accent hover:text-accent"
        >
          shejin.abu@gmail.com →
        </a>

        <a
          href="/files/ShejinAbu-26.pdf"
          download="Shejin-Abu-CV.pdf"
          class="inline-flex items-center gap-2 rounded-full bg-paper px-5 py-2.5 font-data text-[13px] text-ink transition-colors hover:bg-accent-text hover:text-white"
        >
          Download CV
        </a>
      </div>

      <div
        ref="restRef"
        class="relative mt-24 flex flex-wrap items-end justify-between gap-6 border-t border-white/15 pt-8"
      >
        <!-- The last frame of the journey. The ball comes to rest bouncing at
             the midpoint of this rule, so he stands to the right of it with his
             hands on his hips — the game is over, which is what the bottom of a
             page is.

             Absolutely placed inside the rule's own row, so `bottom-full` is
             its top border and his feet land on exactly the line the ball is
             bouncing on. Out of flow, so the flex row below is untouched.

             An earlier and shallower window than the other cameos get, because
             this one is inside the last screen of the document and the default
             asks for scroll that does not exist: at maximum scroll he is still
             65% down the viewport, so a window ending at `top 42%` can never
             finish and he would be caught permanently half way out of a stand.

             The `lie` pose built from the reference photo is still in the pose
             table, unused, if this should ever change its mind. -->
        <!-- The one cameo that is not `--cameo` wide, and it is a deliberate
             exception rather than a drift. Every other player stands on white
             at 152px; this one stands on near-black, where a flat figure loses
             its edges to the background and reads smaller than it measures.
             205px puts it back. -->
        <div class="player-glow pointer-events-none absolute bottom-full right-[7%] hidden w-[205px] lg:block">
          <ThePlayer move="footer" flip tone="dark" start="top 120%" end="top 56%" />
        </div>
        <div class="flex flex-wrap gap-10">
          <div class="text-xs uppercase tracking-wide text-white/50">
            Location
            <span class="mt-1.5 block font-data text-[13px] normal-case tracking-normal text-paper">
              Dubai, UAE
            </span>
          </div>
          <div class="text-xs uppercase tracking-wide text-white/50">
            Phone
            <span class="mt-1.5 block font-data text-[13px] normal-case tracking-normal text-paper">
              +971 56 383 4835
            </span>
          </div>
          <div class="text-xs uppercase tracking-wide text-white/50">
            Status
            <span class="mt-1.5 block font-data text-[13px] normal-case tracking-normal text-paper">
              Open to relocation
            </span>
          </div>
        </div>

        <div class="flex gap-6">
          <a
            href="https://linkedin.com/in/shejin-abu-dev"
            target="_blank"
            rel="noopener"
            aria-label="Shejin Abu on LinkedIn (opens in a new tab)"
            class="text-[13px] text-white/60 transition-colors hover:text-accent"
          >
            LinkedIn
          </a>
          <a
            href="https://github.com/shejin-abu5"
            aria-label="GitHub"
            class="text-[13px] text-white/60 transition-colors hover:text-accent"
          >
            GitHub
          </a>
          <a
            href="mailto:shejin.abu@gmail.com"
            aria-label="Email Shejin Abu"
            class="text-[13px] text-white/60 transition-colors hover:text-accent"
          >
            Email
          </a>
        </div>
      </div>
    </div>
  </footer>
</template>

<style scoped>
/* A soft lift behind the player, and the only place on the page that needs one.

   Everywhere else he stands on paper and his own edges do the separating. Here
   the ground is #121212 and the figure's darkest parts — hair, the back leg's
   shading, the shadow under his boots — are close enough to it that the
   silhouette breaks up: he reads as a few bright shapes rather than one person.

   Warm rather than neutral, and the same accent the ball is, so it reads as
   light coming off the pitch rather than as a vignette pasted behind him. */
/* `isolation` is load-bearing, not tidiness. The glow is a `z-index: -1`
   pseudo-element, and without a stacking context of its own here that -1 is
   resolved against the footer — which paints its own near-black background in
   the same context, directly over the top of it. The glow was there the whole
   time and behind the wall. */
.player-glow {
  isolation: isolate;
}

.player-glow::before {
  content: '';
  position: absolute;
  z-index: -1;
  inset: -16% -34% -10%;
  border-radius: 9999px;
  background: radial-gradient(circle, rgba(255, 124, 62, 0.26), rgba(255, 124, 62, 0) 70%);
}
</style>
