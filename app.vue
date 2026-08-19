<script setup lang="ts">
const siteUrl = 'https://shejinabu.com'
const canonical = `${siteUrl}/`
const ogImage = `${siteUrl}/og-image.png`
const title = 'Shejin Abu — Senior Frontend / UX Developer in Dubai, UAE'
const description =
  'Frontend / UX Developer in Dubai working in Vue.js and React.js. 12+ years shipping automotive and enterprise platforms across the Middle East and Africa, including the Vue.js CMS component library behind the regional sites of global automotive brands.'

useSeoMeta({
  title,
  description,
  keywords:
    'Senior Frontend Developer Dubai, Vue.js Developer UAE, React Developer Dubai, Redux Developer UAE, Nuxt 3 Developer Dubai, Frontend Engineer Middle East, Automotive Frontend Developer, UI/UX Developer UAE',
  author: 'Shejin Abu',

  // `index, follow` on its own leaves Google's defaults in place, and two of
  // those defaults cost this page real estate: snippets are capped near 160
  // characters, and image previews are capped at thumbnail size. The three
  // max-* directives lift both caps — they are what allows the OG card to run
  // as a large image in Discover and in rich results, rather than as a
  // postage stamp beside the link.
  robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',

  ogType: 'profile',
  ogTitle: title,
  ogDescription: description,
  // Trailing slash, matching the canonical in nuxt.config. These two
  // disagreeing is how one page ends up counted as two.
  ogUrl: canonical,
  ogLocale: 'en_US',
  ogSiteName: 'Shejin Abu — Portfolio',
  ogImage,
  // Declared rather than left to be discovered. Scrapers that render the card
  // before they have fetched the image — LinkedIn and WhatsApp among them —
  // fall back to the small layout when they cannot tell the aspect ratio in
  // time. The file really is 1200×630.
  ogImageWidth: 1200,
  ogImageHeight: 630,
  ogImageType: 'image/png',
  ogImageAlt: 'Shejin Abu — Frontend / UX Developer, Dubai',
  profileFirstName: 'Shejin',
  profileLastName: 'Abu',

  twitterCard: 'summary_large_image',
  twitterTitle: title,
  twitterDescription: description,
  twitterImage: ogImage,
  twitterImageAlt: 'Shejin Abu — Frontend / UX Developer, Dubai'
})

// JSON-LD structured data — helps search engines understand this as a
// Person / professional profile rather than generic marketing copy.
//
// Written as an @graph rather than a lone Person so the three things this URL
// actually is can be stated separately and then linked by @id: the person, the
// site, and the page about the person. A bare Person node leaves a crawler to
// infer which of those the URL denotes; naming the ProfilePage and pointing its
// mainEntity at the Person says it outright, which is the form Google documents
// for a personal profile page.
const personId = `${siteUrl}/#person`
const websiteId = `${siteUrl}/#website`

useHead({
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'Person',
            '@id': personId,
            name: 'Shejin Abu',
            givenName: 'Shejin',
            familyName: 'Abu',
            jobTitle: 'Senior Frontend / UX Developer',
            description,
            url: canonical,
            image: ogImage,
            email: 'mailto:shejin.abu@gmail.com',
            telephone: '+971-56-383-4835',
            address: {
              '@type': 'PostalAddress',
              addressLocality: 'Dubai',
              addressCountry: 'AE'
            },
            // Every profile the footer already links out to. sameAs is the
            // claim that these accounts are the same entity as this page, and
            // it is the main thing an entity index has to work with — leaving
            // GitHub out of it while linking it in the DOM was a gap.
            sameAs: [
              'https://linkedin.com/in/shejin-abu-dev',
              'https://github.com/shejin-abu5'
            ],
            worksFor: {
              '@type': 'Organization',
              name: 'Alternative Agency',
              address: {
                '@type': 'PostalAddress',
                addressLocality: 'Dubai',
                addressCountry: 'AE'
              }
            },
            hasOccupation: {
              '@type': 'Occupation',
              name: 'Senior Frontend / UX Developer',
              occupationLocation: {
                '@type': 'City',
                name: 'Dubai'
              },
              skills:
                'Vue.js, Nuxt, React.js, Redux, TypeScript, Tailwind CSS, GSAP, WebGL, REST API Integration'
            },
            knowsAbout: [
              'Vue.js',
              'Nuxt',
              'React.js',
              'Redux',
              'TypeScript',
              'Micro Frontends',
              'Tailwind CSS',
              'GSAP',
              'WebGL',
              'REST API Integration'
            ]
          },
          {
            '@type': 'WebSite',
            '@id': websiteId,
            url: canonical,
            name: 'Shejin Abu — Portfolio',
            description,
            inLanguage: 'en',
            publisher: { '@id': personId }
          },
          {
            '@type': 'ProfilePage',
            '@id': `${siteUrl}/#webpage`,
            url: canonical,
            name: title,
            description,
            inLanguage: 'en',
            isPartOf: { '@id': websiteId },
            about: { '@id': personId },
            mainEntity: { '@id': personId },
            primaryImageOfPage: {
              '@type': 'ImageObject',
              url: ogImage,
              width: 1200,
              height: 630
            }
          }
        ]
      })
    }
  ]
})
</script>

<template>
  <div>
    <a
      href="#main-content"
      class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-md focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:text-white"
    >
      Skip to content
    </a>

    <TheScrollBall />

    <TheNav />
    <HeroSection />

    <main id="main-content">
      <ProjectsSection />
      <ExperienceSection />
      <SkillsSection />
      <EduLangSection />
      <PartnersSection />
    </main>

    <TheFooter />
  </div>
</template>
