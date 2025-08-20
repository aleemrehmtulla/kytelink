import { VStack } from '@chakra-ui/react'

import { NextSeo } from 'next-seo'

import { useEffect } from 'react'
import { trackClientEvent } from 'lib/posthog'
import { PosthogEvents } from 'consts/posthog'

import LandingFooter from 'components/Landing/LandingFooter'
import LandingBusinessFeatures from 'components/Landing/LandingBusinessFeatures'
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
        title="TradLink - Professional Link-in-Bio for Business Growth"
        description="Transform your bio link into a powerful business tool. Advanced analytics, custom domains, premium themes, and lead generation features designed for entrepreneurs and businesses."
        canonical="https://tradlink.com"
      />

      <VStack
        minH={{ base: '80vh', lg: '95vh' }}
        justify="space-between"
        spacing={{ base: 20, lg: 48 }}
        mt={{ base: 52, lg: 60 }}
        color="black"
      >
        <LandingHero />

        <LandingDemo />

        <VStack spacing={32}>
          <LandingExamples />
          <LandingDomains />
          <LandingAnalytics />
          <LandingBusinessFeatures />
          <LandingFooter />
        </VStack>
      </VStack>
    </>
  )
}

export default Home
