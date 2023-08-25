import { VStack } from '@chakra-ui/react'

import { NextSeo } from 'next-seo'

import { useEffect } from 'react'
import { trackClientEvent } from 'lib/posthog'
import { PosthogEvents } from 'consts/posthog'

import LandingFooter from 'components/Landing/LandingFooter'
import LandingOpenSource from 'components/Landing/LandingOpenSource'
import LandingAnalytics from 'components/Landing/LandingAnalytics'
import LandingDomains from 'components/Landing/LandingDomains'
import LandingExamples from 'components/Landing/LandingExamples'
import LandingHero from 'components/Landing/LandingHero'
import LandingDemo from 'components/Landing/LandingDemo'

const Home = () => {
  useEffect(() => {
    trackClientEvent({ event: PosthogEvents.HIT_LANDING })
  }, [])
  return (
    <>
      <NextSeo
        title="Kytelink - Simple & Free Link-In-Bio"
        description="Kytelink is an opensource Linktree alternative that allows you to share all your links in one place. Add custom domains, view click statistics and more."
        canonical="https://kytelink.com"
      />

      <VStack
        minH={{ base: '80vh', md: '95vh' }}
        justify="space-between"
        spacing={{ base: 20, md: 48 }}
        mt={{ base: 52, md: 60 }}
        color="black"
      >
        <LandingHero />

        <LandingDemo />

        <VStack spacing={32}>
          <LandingExamples />
          <LandingDomains />
          <LandingAnalytics />
          <LandingOpenSource />
          <LandingFooter />
        </VStack>
      </VStack>
    </>
  )
}

export default Home
