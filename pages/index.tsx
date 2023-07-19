import { NextPage } from 'next'

import { HStack, VStack } from '@chakra-ui/react'

import { NextSeo } from 'next-seo'

import LandingLayout from 'components/Layouts/LandingLayout'

import HorizontalScroll from 'components/Landing/HorizontalScroll'
import StarBox from 'components/Landing/StarBox'
import MainContent from 'components/Landing/MainContent'
import ExampleKytes from 'components/Landing/ExampleKytes'

const Home = () => {
  return (
    <>
      <NextSeo
        title="Kytelink - the link for all your links"
        description="Kytelink is an opensource Linktree alternative that allows you to share all your links in one place. Add custom domains, view click statistics and more."
        canonical="https://kytelink.com"
      />
      <VStack
        color="black"
        textAlign="center"
        px={{ base: 2, md: 12 }}
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
    </>
  )
}

export default Home

Home.getLayout = function getLayout(page: NextPage) {
  return <LandingLayout>{page}</LandingLayout>
}
