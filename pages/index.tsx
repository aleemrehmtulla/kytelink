import { useState } from 'react'

import {
  Box,
  Button,
  Center,
  Heading,
  HStack,
  Image,
  Input,
  Text,
  useBreakpointValue,
  VStack,
} from '@chakra-ui/react'

import { NextPage } from 'next'
import { NextSeo } from 'next-seo'

import FeatureIcons from 'components/Landing/FeatureIcons'
import Footer from 'components/Landing/Footer'
import GrabYours from 'components/Landing/GrabYours'
import HorizontalScroll from 'components/Landing/HorizontalScroll'
import LandingLayout from 'components/Layouts/LandingLayout'
import SimpleDashboard from 'components/Landing/SimpleDashboard'
import HeroInput from 'components/Landing/HeroInput'

const Home = () => {
  const [link, setLink] = useState('')

  const images = ['amy', 'cce', 'rochan']
  const isMobile = useBreakpointValue({ base: true, md: false })

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

      <VStack align="center">
        <VStack spacing={2} color="black" textAlign="center">
          <Heading
            fontWeight={{ base: 'black', md: 'extrabold' }}
            fontSize={{ base: '4xl', md: '6xl' }}
            pt={{ base: 12, md: 20 }}
          >
            Simple. Fast. Free.
          </Heading>
          <Heading fontWeight="black" bg="purple.200" fontSize={{ base: '2xl', md: '6xl' }}>
            the link for all your links
          </Heading>
          <Box h={6} />

          <HeroInput setLink={setLink} signup={signup} />

          <FeatureIcons />

          <HStack pt={16} spacing={{ base: 12, md: 20 }}>
            {images.map((image, index) => (
              <Box
                display={{
                  base: index === 0 || index == 2 ? 'block' : 'none',
                  md: 'block',
                }}
                _hover={
                  !isMobile
                    ? { transform: 'scale(1.01) ', opacity: 0.8 }
                    : {
                        opacity: 0.8,
                      }
                }
                transitionDuration="0.2s"
                key={index}
                border="1px"
                cursor="pointer"
                borderWidth={6}
                p={1}
                w={{ base: 32, md: 60 }}
                rounded="xl"
                onClick={() => {
                  window.open(`https://kytelink.com/${image}`)
                }}
              >
                <Image alt="index" src={`/assets/landing/users/${image}.png`} />
              </Box>
            ))}
          </HStack>

          <SimpleDashboard />
          <HorizontalScroll />
          <GrabYours />

          <VStack pt={{ base: 4, md: 16 }} spacing={4}>
            <Heading fontSize={{ base: 'md', md: '4xl' }}>
              Build your profile amazing using kyte.
            </Heading>
            <Button
              w="full"
              bg="black"
              color="white"
              size="lg"
              _focus={{ outline: 'none' }}
              _hover={{ opacity: 0.8 }}
              _active={{ opacity: 0.5 }}
              onClick={signup}
            >
              Sign Up
            </Button>
          </VStack>

          <Footer />
        </VStack>
      </VStack>
    </>
  )
}

export default Home

Home.getLayout = function getLayout(page: NextPage) {
  return <LandingLayout>{page}</LandingLayout>
}
