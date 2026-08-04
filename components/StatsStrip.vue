<script setup lang="ts">
import { useCountUp } from '~/composables/useReveal'

interface Stat {
  count: number
  label: string
}

const stats: Stat[] = [
  { count: 10, label: 'Years experience' },
  { count: 8, label: 'Regional markets' },
  { count: 4, label: 'API integrations' },
  { count: 5, label: 'Automotive brands' }
]

const numRefs = ref<(HTMLElement | null)[]>([])

onMounted(() => {
  numRefs.value.forEach((el, i) => {
    useCountUp(el, stats[i].count)
  })
})
</script>

<template>
  <div class="mx-auto grid max-w-[1240px] grid-cols-2 border-b border-hair md:grid-cols-4">
    <div
      v-for="(stat, i) in stats"
      :key="stat.label"
      class="border-hair px-6 py-10 md:px-8 md:py-12 [&:nth-child(odd)]:border-r [&:nth-child(-n+2)]:border-b md:[&:not(:last-child)]:border-r md:[&:nth-child(-n+2)]:border-b-0"
    >
      <div
        :ref="(el) => (numRefs[i] = el as HTMLElement)"
        class="font-data text-[clamp(28px,4vw,52px)] font-medium leading-none text-accent"
      >
        0
      </div>
      <div class="mt-2.5 text-xs uppercase tracking-wider text-steel">
        {{ stat.label }}
      </div>
    </div>
  </div>
</template>
