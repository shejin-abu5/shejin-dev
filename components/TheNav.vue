<script setup lang="ts">
import logoUrl from '~/assets/img/brand/shejin-abu.png'

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

/**
 * The id each link points at, rather than a written-out href, so the anchor
 * and the scroll spy cannot drift apart — they are the same string. Both used
 * to be spelled out separately and both were wrong: Work pointed at
 * #experience, and Career pointed at #career, which is an id no section on
 * this page has ever carried.
 */
const links = [
  { label: 'Work', id: 'work' },
  { label: 'Career', id: 'experience' },
  { label: 'Skills', id: 'skills' },
  { label: 'Sign Me', id: 'contact' }
]

const { active } = useScrollSpy(links.map((link) => link.id))
</script>

<template>
  <nav
    aria-label="Primary"
    class="fixed inset-x-0 top-0 z-[100] px-5 py-[22px] md:px-8 backdrop-blur-md bg-white/85 border-b transition-colors duration-300"
    :class="scrolled ? 'border-hair' : 'border-transparent'"
  >
    <div class="flex items-center justify-between">
      <a href="#" class="flex items-center gap-2.5" aria-label="Shejin Abu — home">
        <img
          :src="logoUrl"
          alt="Shejin Abu"
          aria-hidden="true"
          width="44"
          height="44"
          class="h-7 w-7 shrink-0 md:h-11 md:w-11 object-contain"
        />
      </a>

      <div class="hidden md:flex gap-9 items-center">
        <a
          v-for="link in links"
          :key="link.id"
          :href="`#${link.id}`"
          :data-label="link.label"
          :aria-current="active === link.id ? 'true' : undefined"
          class="nav-link text-[13px] uppercase tracking-wider transition-colors"
          :class="
            active === link.id
              ? 'font-semibold text-ink'
              : 'font-medium text-steel hover:text-ink'
          "
        >
          {{ link.label }}
        </a>
      </div>

      <div class="flex items-center gap-3">
        <div
          class="flex items-center gap-1.5 rounded-full border border-hair px-3 py-1.5 sm:px-3.5"
        >
          <span class="h-1.5 w-1.5 rounded-full bg-green-300" aria-hidden="true" />
          <span class="font-data text-[11px] tracking-wide text-steel">
            Open to work
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
        :key="link.id"
        :href="`#${link.id}`"
        :aria-current="active === link.id ? 'true' : undefined"
        class="rounded-md px-2 py-2.5 text-sm uppercase tracking-wider transition-colors"
        :class="
          active === link.id
            ? 'font-semibold text-ink'
            : 'font-medium text-steel hover:bg-paper-soft hover:text-ink'
        "
        @click="closeMenu"
      >
        {{ link.label }}
      </a>
    </div>
  </nav>
</template>

<style scoped>
/*
 * The active link thickens from 500 to 600, and a bolder label is a wider
 * label. In a flex row of four that width has to come from somewhere: every
 * handover would shove the remaining links sideways by a pixel or two, so the
 * whole row would twitch its way down the page as you scrolled. Small, but it
 * is the kind of movement you see without being able to say what moved.
 *
 * So each link permanently occupies the width of its own bold label, whichever
 * weight it is currently drawn at — a copy of the label at 600 that has no
 * height, cannot be seen, and is skipped by screen readers because it is
 * `visibility: hidden`. The visible text is centred in that reserved space.
 * Nothing on the row ever changes width, and the only thing that moves between
 * one section and the next is the ink.
 *
 * Not needed on the mobile menu: it is a stacked column of full-width rows,
 * with nothing beside a link to push.
 */
.nav-link {
  text-align: center;
}

.nav-link::after {
  content: attr(data-label);
  display: block;
  height: 0;
  overflow: hidden;
  visibility: hidden;
  font-weight: 600;
  pointer-events: none;
}
</style>
