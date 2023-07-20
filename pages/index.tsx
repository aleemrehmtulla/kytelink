import { Container, HStack, VStack } from '@chakra-ui/react'

import { NextSeo } from 'next-seo'

import HorizontalScroll from 'components/Landing/HorizontalScroll'
import StarBox from 'components/Landing/StarBox'
import MainContent from 'components/Landing/MainContent'
import ExampleKytes from 'components/Landing/ExampleKytes'
import LandingHeader from 'components/Headers/LandingHeader'

const Home = () => {
  return (
    <>
      <NextSeo
        title="Kytelink - the link for all your links"
        description="Kytelink is an opensource Linktree alternative that allows you to share all your links in one place. Add custom domains, view click statistics and more."
        canonical="https://kytelink.com"
      />

      <LandingHeader />

      <Container maxW="container.2xl" pt={{ base: '60px', md: '92px' }} px={{ base: 4, md: 12 }}>
        <VStack
          color="black"
          textAlign="center"
          pt={{ base: '3rem', md: '4rem' }}
          spacing={{ base: 16, md: 28 }}
        >
          <HStack w="full" justify="space-between">
            <VStack w="lg" align="left" textAlign="left" spacing={6}>
              <StarBox />
              <MainContent />
            </VStack>
            <ExampleKytes />
          </HStack>

          <HorizontalScroll />
        </VStack>
      </Container>
    </>
  )
}

export default Home
