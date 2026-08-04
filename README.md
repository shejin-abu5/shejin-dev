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

## Content

All copy, numbers, and project/experience data are pulled directly from the CV and
live in each component's `<script setup>` block as typed data arrays — edit those
arrays directly to update content, no need to touch markup.

**Skills** are grouped into: Languages, Frameworks, State management, Styling,
Animation, Build tools, Developer tools, Version control, and Accessibility &
localization (the last one isn't in the standard list but covers real,
UAE-relevant CV content — RTL layouts and Arabic/English builds — that didn't
fit anywhere else). No testing frameworks are listed because none are on the
CV; the category was left out rather than padded.

**Featured Projects** are full case-study cards (screenshot placeholder,
description, tech used, contribution, challenge, outcome) for the six
platforms with enough real detail to write about honestly: Nissan's New
Patrol Launch Platform and Configurator, INFINITI's Inventory Tool, Ford
Dealership KSA, Lincoln M.Y. Naghi KSA, and the Peugeot Webstore. The
remaining platforms (Magnite Microsite, Petromin KSA, the Nismo microsites,
Morocco Official, InvestAD, Alternative Agency, Jos Alukkas) are listed below
the cards without full write-ups, since the CV doesn't have individual notes
for each one.

**A note on honesty here**: the CV lists project names, not individual
descriptions, so "contribution" / "challenge" / "outcome" for each card are
written at the level of detail the CV's general experience bullets actually
support (Figma-to-code translation, GSAP/WebGL, RTL builds, API integration),
applied to whichever project it plausibly connects to — not invented
project-specific metrics or war stories. None of the projects had a live URL
listed against them individually, so `demoUrl` is `null` for all six and the
card shows "Live link not listed" instead of a link. If you have the real
URLs, add them to the `featured` array in `ProjectsSection.vue`.

**Contact** includes a working "Download CV" button (the uploaded PDF, copied
to `public/files/Shejin-Abu-CV.pdf`) and a GitHub link. The GitHub URL wasn't
provided, so it currently points to `#` with a `TODO` comment in
`TheFooter.vue` — swap in the real profile URL.

## Portfolio structure pass (GreatFrontEnd guidance)

Reviewed against [greatfrontend.com/blog/frontend-developer-portfolio](https://www.greatfrontend.com/blog/frontend-developer-portfolio),
whose core advice is: lead with a direct, specific claim rather than a vague
bio, show 2–4 real case studies instead of every project you've touched, and
write case studies as judgment/decisions rather than a spec-sheet table. That
led to:

- **Hero copy rewritten to lead with the strongest, most specific claim**:
  the Vue.js CMS component library built for Nissan and Ford's regional
  sites, ahead of the general "10+ years / MEA" framing.
- **Selected Work cut down to 5 named projects** (New Patrol Launch Platform,
  Parts e-commerce, Magnite Microsite, INFINITI Inventory Tool, Nissan
  Morocco Official) instead of the full case-study grid for every brand plus
  a long "additional platforms" list — that list-everything pattern is
  called out directly in the article as a common mistake.
  `allnewpatrol.nissan-dubai.com` is wired in as a real live link; the rest
  show a "Screenshot / video — coming soon" placeholder box (swap in real
  media/URLs in `ProjectsSection.vue` once ready) rather than a fabricated
  link.
  Ford, Lincoln, Peugeot, and Invest AD work is now a single line, not a
  table.
- **Case-study copy is flowing prose, not a labeled table** — one paragraph
  covering what it is + what was built, not separate
  Problem/Context/Role/Tradeoffs/Quality/Result fields. That's a deliberate
  trade-off toward "minimal and cool" over the article's fuller case-study
  template — if you want the deeper structure later (tradeoffs, how you
  checked quality, what you'd improve with more time), that's a quick
  follow-up.
- **Experience trimmed** from 6 bullets down to 4 for the current role (and
  3→2 for the previous one), keeping the Vue component-library point and
  cutting anything that repeated the same idea.

## Vue vs. React positioning

Current work is almost entirely Vue.js — there's no React project to
showcase, and the site shouldn't imply otherwise. At the same time, React.js
and Redux are real skills (Golden Star Media, per the CV) and worth being
visible to a recruiter or ATS scanning for either keyword. The balance struck:

- **Hero and meta description** lead with "Frontend / UI Developer working in
  Vue.js and React.js" at the role level, so a keyword scan for either
  framework matches, before naming the Vue-specific CMS achievement as the
  supporting detail.
- **Skills section** states the real depth directly: "Vue.js is the primary
  framework in current work; React.js and Redux from earlier roles." No
  hedging, no implying they're equally deep.
- **Experience** shows this naturally instead of asserting it: the current
  role's bullets are genuinely Vue-only (that's honest), and the Golden Star
  Media bullet is where React.js/Redux actually show up.
- **Selected Work stays Vue-only** — those five projects really were built in
  Vue, so no React tag was added there just for balance.

If a specific role calls for deep React ownership, the honest move is a real
React side project or contribution before applying, not new copy here.

## SEO & web standards

- **Meta tags**: title, description, and `keywords` targeting how UAE recruiters
  actually search — "Senior Frontend Developer Dubai", "Vue.js Developer UAE",
  "Nuxt 3 Developer Dubai" — set via `useSeoMeta()` in `app.vue`.
- **Open Graph / Twitter Cards**: set in the same block, so links shared on
  LinkedIn, WhatsApp, or Slack render a title, description, and image instead
  of a bare URL.
- **JSON-LD structured data**: a `Person` schema (name, job title, employer,
  location, LinkedIn, skills) is injected via `useHead()` in `app.vue`, which
  is what lets Google understand this as a professional profile.
- **Semantic landmarks**: `<nav>`, `<header>`, `<main>`, and `<footer>` are all
  used correctly, with a "Skip to content" link for keyboard users and
  `aria-label`s on the nav and footer social links.
- **robots.txt** and **sitemap.xml** live in `public/` and are served as-is.
- **Favicon**: a simple SVG favicon (`public/favicon.svg`) using the site's
  ink/accent colors.

### Before you deploy

1. Replace `https://shejinabu.dev` (in `nuxt.config.ts`, `app.vue`,
   `public/robots.txt`, and `public/sitemap.xml`) with your real domain.
2. Add a real `public/og-image.jpg` (1200×630px) — a screenshot of the hero
   works well — so link previews show an actual image instead of a broken one.
3. If you register a custom domain, consider adding Google Search Console and
   submitting `sitemap.xml` there.
4. For the best Lighthouse performance score, deploy the static build
   (`npm run generate` → the `.output/public` folder) to a static host/CDN
   rather than running the Node server, since this site has no dynamic data.

## Dev-review pass

A second pass through every component in dev tools / Lighthouse turned up a
few real issues, now fixed:

- **Color contrast (Lighthouse a11y flag)**: the accent orange (`#FF4A1F`)
  only reaches ~3.4:1 contrast on white, which fails WCAG AA for normal-size
  text (needs 4.5:1). It still passes for large text (stat numbers, the hero
  "UI" highlight), so it stays there. Small accent-colored text — section
  eyebrows, company names, skill category labels — now uses a darker
  `accent-text` token (`#CC3D10`, ~5:1) added in `tailwind.config.ts`.
- **Conflicting Tailwind classes (real bug)**: the stat-strip grid had two
  border-related classes applied to the same element with equal CSS
  specificity, so which one won was undefined rather than intentional.
  Replaced with static `nth-child`-based selectors that produce the correct
  border pattern at both breakpoints with no per-index JavaScript logic.
- **Missing `list-none` (visible bug)**: the Experience bullets used a custom
  `::before` dash marker but never removed the browser's default list bullet,
  so both would have rendered. Fixed.
- **CSS-generated content used for meaningful punctuation**: the project list
  separators were implemented as dynamically-built `after:content-[...]`
  classes — fragile, and screen readers can double up on this kind of
  content. Replaced with plain markup and an `aria-hidden` separator span.
- **Heading hierarchy**: the Education/Languages section jumped straight from
  the previous section's `<h2>` to `<h3>`s with no section heading of its
  own. Added a visually-hidden `<h2>` so the outline reads correctly for
  screen readers and search engines.
- **Landmark structure**: content is now wrapped in `<main>` (was previously
  just a flat stack of `<section>`s with no landmark), with a "Skip to
  content" link for keyboard users.
- **Mobile navigation gap**: nav links were `hidden md:flex` with no
  fallback, so mobile users had no way to jump to a section except
  scrolling. Added a working hamburger menu.
- **Custom CSS audit**: removed the one custom class (`.animate-marquee`)
  that Tailwind could express natively — it's now an inline arbitrary-value
  utility (`animate-[scroll-left_32s_linear_infinite]`), with reduced-motion
  handled by Tailwind's built-in `motion-reduce:` variant instead of a
  duplicate hand-written override. What's left in `main.css` (selection
  color, focus ring, the marquee's `@keyframes`, smooth-scroll) is genuinely
  global/document-level CSS with no Tailwind utility equivalent — each rule
  is commented with why it's there, so it's easy to challenge in a future
  review.
