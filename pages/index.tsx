import { useState } from 'react'

import { Heading, useBreakpointValue, VStack } from '@chakra-ui/react'

import { NextPage } from 'next'
import { NextSeo } from 'next-seo'

import FeatureIcons from 'components/Landing/FeatureIcons'
import Footer from 'components/Landing/Footer'
import GrabYours from 'components/Landing/GrabYours'
import HorizontalScroll from 'components/Landing/HorizontalScroll'
import LandingLayout from 'components/Layouts/LandingLayout'
import SimpleDashboard from 'components/Landing/SimpleDashboard'
import HeroInput from 'components/Landing/HeroInput'
import ExamplePages from 'components/Landing/ExamplePages'
import HeaderText from 'components/Landing/HeaderText'
import ConvertButton from 'components/Landing/ConvertButton'

const Home = () => {
  const [link, setLink] = useState('')

  const isMobile = useBreakpointValue({ base: true, md: false })

  if (isMobile === undefined) return null

  const signup = async () => {
    if (link) {
      location.href = `/signup?username=${link}`
    } else {
      location.href = '/signup'
    }
  }

  return (
    <>
      <NextSeo
        title="Kytelink - the link for all your links"
        description="Kytelink is an opensource Linktree alternative that allows you to share all your links in one place. Add custom domains, view click statistics and more."
        canonical="https://kytelink.com"
      />
      <VStack spacing={8} color="black" textAlign="center" pt={{ base: 8, md: 16 }}>
        <HeaderText />

        {!isMobile && <HeroInput setLink={setLink} signup={signup} />}

        <FeatureIcons />

        {isMobile && <SimpleDashboard />}
        {!isMobile && <ExamplePages isMobile={isMobile} />}
        {isMobile && <ConvertButton signup={signup} width="85%" />}

        {isMobile && <HorizontalScroll isMobile={isMobile} />}
        {!isMobile && <SimpleDashboard />}

        {!isMobile && <HorizontalScroll isMobile={isMobile} />}

        {isMobile && <ExamplePages isMobile={isMobile} />}
        {isMobile && <ConvertButton signup={signup} width="85%" text="Get Started" />}

        <GrabYours />

        <VStack pt={{ base: 4, md: 16 }} spacing={4}>
          <Heading fontSize={{ base: 'md', md: '4xl' }}>
            Build your profile amazing using kyte.
          </Heading>
          <ConvertButton signup={signup} />
        </VStack>

        <Footer />
      </VStack>
    </>
  )
}

export default Home

Home.getLayout = function getLayout(page: NextPage) {
  return <LandingLayout>{page}</LandingLayout>
}
