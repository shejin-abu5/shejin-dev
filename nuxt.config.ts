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
      ],

      // Umami — page views, plus the custom events fired through
      // `composables/track.ts` (CV downloads, contact clicks, outbound project
      // links, read depth). Cookieless and it stores no personal data, which is
      // what keeps this site free of a consent banner; Cloudflare's own beacon,
      // allow-listed alongside this one in `public/_headers`, is injected at
      // the edge and covers page views and web vitals but has no events API at
      // all, which is the gap this fills.
      script: [
        {
          src: 'https://cloud.umami.is/script.js',
          // `defer` rather than `async`: nothing on the page reads `window.umami`
          // during parse — `track()` is only ever called from a click handler or
          // a post-mount watcher — so there is no reason to let an analytics
          // script interrupt the first render to execute.
          defer: true,

          // Public by design. It ships in the served HTML whatever we do with
          // it, exactly like `siteUrl` above, and it is an identifier for the
          // dashboard rather than a credential for it — there is no write
          // access behind it. Not a secret, so not treated as one.
          'data-website-id': 'REPLACE_WITH_UMAMI_WEBSITE_ID',

          // Delivery is pinned to the production hostname, so the script loads
          // on the dev server and stays quiet there. Without this every local
          // reload files a page view and every click made while building a
          // feature lands in the real numbers — on a portfolio whose genuine
          // traffic is measured in tens of visits, developer noise would be
          // most of the dataset.
          'data-domains': 'shejinabu.com'
        }
      ]
    }
  },

  typescript: {
    strict: true
  }
})
