<script setup lang="ts">
import { gsap } from 'gsap'

const footerRef = ref<HTMLElement | null>(null)

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
        Open to Senior Frontend / UI roles in the UAE.
      </h2>

      <p class="footer-fade mt-6 max-w-[520px] text-[15px] leading-relaxed text-white/60">
        If this looks like a fit for a role you're hiring for, feel free to reach out.
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
          href="/files/Shejin-Abu-CV.pdf"
          download
          class="inline-flex items-center gap-2 rounded-full bg-paper px-5 py-2.5 font-data text-[13px] text-ink transition-colors hover:bg-accent-text hover:text-white"
        >
          Download CV
        </a>
      </div>

      <div class="mt-24 flex flex-wrap items-end justify-between gap-6 border-t border-white/15 pt-8">
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
              Employed, open to relocation
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
          <!--
            TODO: no GitHub URL was provided — replace href with the real
            profile URL. Left pointing to "#" rather than a guessed link.
          -->
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
