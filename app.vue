<script setup lang="ts">
const siteUrl = useRuntimeConfig().public.siteUrl
const title = 'Shejin Abu — Senior Frontend / UI Developer in Dubai, UAE'
const description =
  "Frontend / UI Developer in Dubai working in Vue.js and React.js. 10+ years shipping automotive and enterprise platforms across the Middle East and Africa, including the Vue.js CMS component library built for Nissan and Ford's regional sites."

useSeoMeta({
  title,
  description,
  keywords:
    'Senior Frontend Developer Dubai, Vue.js Developer UAE, React Developer Dubai, Redux Developer UAE, Nuxt 3 Developer Dubai, Frontend Engineer Middle East, Automotive Frontend Developer, UI Developer UAE',
  author: 'Shejin Abu',
  robots: 'index, follow',
  ogType: 'profile',
  ogTitle: title,
  ogDescription: description,
  ogUrl: siteUrl,
  ogImage: `${siteUrl}/og-image.png`,
  ogImageAlt: 'Shejin Abu — Senior Frontend / UI Developer, Dubai',
  ogSiteName: 'Shejin Abu — Portfolio',
  twitterCard: 'summary_large_image',
  twitterTitle: title,
  twitterDescription: description,
  twitterImage: `${siteUrl}/og-image.png`
})

// JSON-LD structured data — helps search engines understand this as a
// Person / professional profile rather than generic marketing copy.
useHead({
  link: [{ rel: 'canonical', href: `${siteUrl}/` }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Person',
        name: 'Shejin Abu',
        jobTitle: 'Senior Frontend / UI Developer',
        url: siteUrl,
        image: `${siteUrl}/og-image.png`,
        email: 'mailto:shejin.abu@gmail.com',
        telephone: '+971-56-383-4835',
        address: {
          '@type': 'PostalAddress',
          addressLocality: 'Dubai',
          addressCountry: 'AE'
        },
        sameAs: ['https://linkedin.com/in/shejin-abu-dev'],
        worksFor: {
          '@type': 'Organization',
          name: 'Alternative Agency'
        },
        knowsAbout: [
          'Vue.js',
          'Nuxt',
          'React.js',
          'Redux',
          'TypeScript',
          'Tailwind CSS',
          'GSAP',
          'WebGL',
          'REST API Integration'
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
    </main>

    <TheFooter />
  </div>
</template>
