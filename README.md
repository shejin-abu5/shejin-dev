# Shejin Abu — Portfolio

Single-page portfolio built with Nuxt 3, Vue 3, TypeScript, and Tailwind CSS.

## Stack

- **Nuxt 3** / **Vue 3** (Composition API, `<script setup lang="ts">`)
- **TypeScript**
- **Tailwind CSS** via `@nuxtjs/tailwindcss`
- **GSAP** + **ScrollTrigger** for the hero line reveal, marquee, count-up stats, and scroll reveals
- **Vite** (Nuxt's default bundler)

## Getting started

```bash
npm install
npm run dev
```

The dev server runs at `http://localhost:3000`.

```bash
npm run build      # production build
npm run generate    # static generation (if you want a fully static export)
npm run preview     # preview a production build locally
```

## Project structure

```
app.vue                     Root layout, assembles all sections
components/
  TheNav.vue                 Fixed nav with scroll-aware border
  HeroSection.vue             Oversized headline, GSAP line reveal
  MarqueeBand.vue             Scrolling client-brand marquee (signature element)
  StatsStrip.vue               Count-up stat strip (years, markets, integrations, brands)
  ProjectsSection.vue          Featured projects, grouped by brand
  ExperienceSection.vue        Career timeline
  SkillsSection.vue            Skills grid by category
  EduLangSection.vue           Education + languages
  TheFooter.vue                Dark contact footer
composables/
  useReveal.ts                 Shared GSAP scroll-reveal + count-up helpers
plugins/
  gsap.client.ts                Registers ScrollTrigger (client-only)
assets/css/
  main.css                      Tailwind directives, marquee keyframes, base styles
tailwind.config.ts            Design tokens: colors (ink/paper/accent/steel/hair), fonts
nuxt.config.ts                 Tailwind module, Google Fonts, meta
```

## Design tokens

| Token | Value | Use |
|---|---|---|
| `ink` | `#121212` | Primary text |
| `paper` | `#FFFFFF` | Background |
| `paper-soft` | `#FAFAF8` | Alternating section background |
| `accent` | `#FF4A1F` | Single accent color (links, stats, highlights) |
| `steel` | `#6B6F76` | Secondary text |
| `hair` | `#E7E5DF` | Hairline borders/dividers |

Fonts: **Archivo** (900, display/headlines), **Inter** (body), **IBM Plex Mono** (data/stats/labels), loaded via Google Fonts in `nuxt.config.ts`.
