<script setup lang="ts">
const scrolled = ref(false)
const menuOpen = ref(false)

function onScroll() {
  scrolled.value = window.scrollY > 10
}

function closeMenu() {
  menuOpen.value = false
}

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
})

const links = [
  { label: 'Work', href: '#work' },
  { label: 'Experience', href: '#experience' },
  { label: 'Skills', href: '#skills' },
  { label: 'Contact', href: '#contact' }
]
</script>

<template>
  <nav
    aria-label="Primary"
    class="fixed inset-x-0 top-0 z-[100] px-5 py-[22px] md:px-8 backdrop-blur-md bg-white/85 border-b transition-colors duration-300"
    :class="scrolled ? 'border-hair' : 'border-transparent'"
  >
    <div class="flex items-center justify-between">
      <div class="font-display font-black text-[15px] uppercase tracking-wide">
        Shejin Abu
      </div>

      <div class="hidden md:flex gap-9 items-center">
        <a
          v-for="link in links"
          :key="link.href"
          :href="link.href"
          class="text-[13px] font-medium uppercase tracking-wider text-steel hover:text-ink transition-colors"
        >
          {{ link.label }}
        </a>
      </div>

      <div class="flex items-center gap-3">
        <div
          class="flex items-center gap-1.5 rounded-full border border-hair px-3 py-1.5 sm:px-3.5"
        >
          <span class="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
          <!-- Shown at every width. Hidden below sm the pill was a bare orange
               dot, which reads as a stray bullet rather than as a status, and
               the row measures ~275px of the 350px a 390px screen has. -->
          <span class="font-data text-[11px] tracking-wide text-steel">
            Open to relocation
          </span>
        </div>

        <button
          type="button"
          class="md:hidden flex h-9 w-9 items-center justify-center rounded-full border border-hair"
          :aria-expanded="menuOpen"
          aria-controls="mobile-menu"
          :aria-label="menuOpen ? 'Close menu' : 'Open menu'"
          @click="menuOpen = !menuOpen"
        >
          <svg
            v-if="!menuOpen"
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
          >
            <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
          </svg>
          <svg v-else width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
          </svg>
        </button>
      </div>
    </div>

    <div
      v-show="menuOpen"
      id="mobile-menu"
      class="md:hidden mt-5 flex flex-col gap-1 border-t border-hair pt-5"
    >
      <a
        v-for="link in links"
        :key="link.href"
        :href="link.href"
        class="rounded-md px-2 py-2.5 text-sm font-medium uppercase tracking-wider text-steel hover:bg-paper-soft hover:text-ink"
        @click="closeMenu"
      >
        {{ link.label }}
      </a>
    </div>
  </nav>
</template>
