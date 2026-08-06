<script setup lang="ts">
const brands = ['NISSAN', 'INFINITI', 'FORD', 'LINCOLN', 'PEUGEOT', 'INVEST AD']
</script>

<template>
  <div class="overflow-hidden whitespace-nowrap border-y border-hair py-5 mt-16 md:mt-20" aria-hidden="true">
    <div class="animate-[scroll-left_32s_linear_infinite] motion-reduce:animate-none inline-flex gap-14">
      <span
        v-for="copy in [0, 1]"
        :key="copy"
        class="flex items-center gap-14 font-display text-[22px] font-bold uppercase tracking-tight"
      >
        <template v-for="brand in brands" :key="brand">
          {{ brand }}
          <em class="not-italic font-normal text-hair">/</em>
        </template>
      </span>
    </div>
  </div>
</template>
