export default defineNuxtConfig({
  compatibilityDate: '2026-01-01',
  devtools: { enabled: true },

  modules: ['@nuxtjs/tailwindcss'],

  // Keeps authored `<!-- … -->` comments out of the rendered DOM.
  //
  // Every template on this site is annotated, and those notes are for whoever
  // opens the .vue file — not for whoever opens devtools. Vue's parser emits
  // each one as a real comment node by default (see `oncomment` in
  // compiler-core, gated on nothing but this flag), so they survive into the dev
  // DOM and into the SSR markup `nuxt generate` writes out. Dropping them at
  // parse time leaves the source exactly as documented and the inspector clean.
  //
  // It does not touch the comments Vue *generates* — the `<!--[-->` fragment
  // anchors and `<!---->` v-if placeholders — which are load-bearing for
  // hydration and are not produced by this code path.
  vue: {
    compilerOptions: {
      comments: false
    }
  },

  css: ['~/assets/css/main.css'],

  // Site URL used to build canonical / OG absolute URLs.
  runtimeConfig: {
    public: {
      siteUrl: 'https://shejinabu.com'
    }
  },

  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      charset: 'utf-8',
      viewport: 'width=device-width, initial-scale=1',
      meta: [{ name: 'theme-color', content: '#FFFFFF' }],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          // Archivo carries one italic — 700, for the supplier band's label in
          // PartnersSection.vue, and nothing else on the site asks for a slant.
          // A real cut rather than letting the browser shear the upright one:
          // faux italic on a grotesque flattens the round letters, and it is
          // plain at that label's weight and tracking. One extra woff2, subset
          // to latin by Google's own stylesheet, behind the same `display=swap`.
          href: 'https://fonts.googleapis.com/css2?family=Archivo:ital,wght@0,500;0,700;0,900;1,700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap'
        },
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'canonical', href: 'https://shejinabu.com/' }
      ]
    }
  },

  typescript: {
    strict: true
  }
})
