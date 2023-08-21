import {
  Box,
  Button,
  Center,
  Flex,
  Heading,
  HStack,
  Image,
  SimpleGrid,
  Text,
  VStack,
} from '@chakra-ui/react'

import { NextSeo } from 'next-seo'

import { useEffect, useState } from 'react'
import { trackClientEvent } from 'lib/posthog'
import { PosthogEvents } from 'consts/posthog'
import { USERS } from 'consts/landingpage'
import { FaGithub, FaTwitter } from 'react-icons/fa'
import TimeSeries from 'components/Editor/Config/Analytics/TimeSeries'
import PageViews from 'components/Editor/Config/Analytics/PageViews'
import TrafficSources from 'components/Editor/Config/Analytics/TrafficSources'

const Home = () => {
  const ANAL = {
    success: true,
    totalHits: 436,
    topLinks: [
      {
        url: 'https://linkedin.com/in/aleemrehmtulla',
        title: 'Linkedin',
        count: 61,
      },
      {
        url: 'https://github.com/aleemrehmtulla',
        title: 'Github',
        count: 68,
      },
      {
        url: 'https://twitter.com/aleemrehmtulla',
        title: 'Twitter',
        count: 16,
      },
    ],
    topCountries: [
      {
        country: null,
        count: 0,
      },
      {
        country: 'CA',
        count: 34,
      },
      {
        country: 'US',
        count: 149,
      },
      {
        country: 'FR',
        count: 1,
      },
      {
        country: 'NL',
        count: 2,
      },
      {
        country: 'PH',
        count: 1,
      },
      {
        country: 'PK',
        count: 1,
      },
    ],
    topDevices: [
      {
        device: 'DESKTOP',
        count: 129,
      },
      {
        device: 'MOBILE',
        count: 92,
      },
      {
        device: 'TABLET',
        count: 1,
      },
      {
        device: 'UNKNOWN',
        count: 214,
      },
    ],
    trafficSources: [
      {
        referrer: 'https://t.co/',
        count: 203,
      },
      {
        referrer: 'https://github.com/aleemrehmtulla',
        count: 23,
      },
      {
        referrer: 'https://www.google.com/',
        count: 9,
      },
      {
        referrer: 'https://aleemrehmtulla.com',
        count: 7,
      },
    ],
    timeSeriesData: [
      {
        date: '07/22',
        views: 2,
      },
      {
        date: '07/23',
        views: 4,
      },
      {
        date: '07/24',
        views: 8,
      },
      {
        date: '07/25',
        views: 16,
      },
      {
        date: '07/27',
        views: 20,
      },
      {
        date: '07/28',
        views: 23,
      },
      {
        date: '07/29',
        views: 35,
      },
      {
        date: '07/30',
        views: 39,
      },
      {
        date: '07/31',
        views: 44,
      },
      {
        date: '08/01',
        views: 46,
      },
      {
        date: '08/02',
        views: 48,
      },
      {
        date: '08/03',
        views: 118,
      },
      {
        date: '08/04',
        views: 149,
      },
      {
        date: '08/05',
        views: 153,
      },
      {
        date: '08/06',
        views: 156,
      },
      {
        date: '08/07',
        views: 172,
      },
      {
        date: '08/08',
        views: 185,
      },
      {
        date: '08/09',
        views: 194,
      },
      {
        date: '08/10',
        views: 195,
      },
      {
        date: '08/11',
        views: 198,
      },
    ],
  }
  const DOMAINS = [
    { text: 'kyte.lol/harsh', color: 'D2F2F4' },
    { text: 'kyte.bio/arib', color: 'DAD2F1' },
    { text: 'kytelink.com/josh', color: 'D8FED2' },
    { text: 'downsad.com/aleem', color: 'FED2D2' },
  ]

  const [scale, setScale] = useState(1)

  useEffect(() => {
    const handleScroll = () => {
      // Here you can define how the scaling should behave based on the scroll position.
      // This is a simple linear scaling. You may want to define a more complex function.
      const newScale = 1 + window.scrollY * 0.0006
      console.log(newScale)
      // if bigger then 1.3, stop
      if (newScale > 1.28) {
        return
      }
      setScale(newScale)
    }

    // Attach the event listener
    window.addEventListener('scroll', handleScroll)

    // Detach the event listener when the component is unmounted
    return () => window.removeEventListener('scroll', handleScroll)
  }, []) // The empty dependency array ensures this effect runs only once.

  useEffect(() => {
    trackClientEvent({ event: PosthogEvents.HIT_LANDING })
  }, [])
  return (
    <>
      <NextSeo
        title="Kytelink - the link for all your links"
        description="Kytelink is an opensource Linktree alternative that allows you to share all your links in one place. Add custom domains, view click statistics and more."
        canonical="https://kytelink.com"
      />

      <VStack
        minH={{ base: '80vh', md: '95vh' }}
        justify="space-between"
        spacing={48}
        mt={60}
        color="black"
      >
        <VStack spacing={4} align="center">
          <VStack spacing={2} align="center">
            <Heading color="black" fontSize="7xl">
              A Typical Link-In-Bio.
            </Heading>
            <Heading color="black" fontSize="7xl">
              But Free and Opensource.
            </Heading>
          </VStack>

          <Text color="gray.600" fontSize="2xl" textAlign="center" pb={2}>
            Custom Domains. 9+ Themes. Detailed Analytics.
          </Text>

          <Button
            bg="#7F61D3"
            rounded="18px"
            fontSize="xl"
            fontWeight="medium"
            color="white"
            px={16}
            py={7}
            _hover={{ opacity: 0.8 }}
            _active={{ opacity: 0.6 }}
            _focus={{ outline: 'none' }}
            as="a"
            href="/login"
          >
            Create your Kytelink
          </Button>
          <Text color="gray.500" fontSize="lg" textAlign="center" cursor={'pointer'}>
            Login
          </Text>
        </VStack>

        <Image
          src="/assets/landing/top.png"
          transform={`scale(${scale})`} // Apply the scale here
        />
        <VStack spacing={32}>
          <VStack spacing={8}>
            <Heading fontSize="6xl">Join thousands of others</Heading>
            <HStack spacing={4}>
              {USERS.map((user) => (
                <Image src={user.pfp} w="80px" h="80px" rounded="full" key={user.username} />
              ))}
            </HStack>
            <Button
              bg="#7F61D3"
              rounded="18px"
              fontSize="xl"
              fontWeight="medium"
              color="white"
              px="80px"
              py={8}
              _hover={{ opacity: 0.8 }}
              _active={{ opacity: 0.6 }}
              _focus={{ outline: 'none' }}
            >
              Build your link in 5 minutes
            </Button>
          </VStack>

          <VStack spacing={8}>
            <VStack spacing={2}>
              <Heading fontSize="6xl">Select one of our 4 domains.</Heading>
              <Heading fontSize="6xl">Or bring your own. For free.</Heading>
            </VStack>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} w="full">
              {DOMAINS.map((domain) => (
                <Center
                  bg={`#${domain.color}`}
                  rounded="xl"
                  alignContent="center"
                  key={domain.text}
                  py={3}
                  px={12}
                >
                  <Text color="#4B4B4B" fontWeight="medium" fontSize="2xl">
                    {domain.text}
                  </Text>
                </Center>
              ))}
            </SimpleGrid>
            <HStack w="100%" spacing={4}>
              <VStack
                bg="#F6FAFE"
                border={1}
                borderColor="#EEEEEE"
                rounded="xl"
                p={4}
                py={20}
                w="full"
                borderWidth={4}
              >
                <Text fontSize="5xl" fontWeight="bold">
                  400ms
                </Text>
                <Text fontSize="lg">Kyte Loads Fast.</Text>
              </VStack>
              <VStack
                bg="#FDF6F3"
                border={1}
                borderColor="#EEEEEE"
                rounded="xl"
                p={4}
                w="full"
                py={20}
                borderWidth={4}
              >
                <Text fontSize="5xl" fontWeight="bold">
                  9 Themes
                </Text>
                <Text fontSize="lg">Kyte Looks Good.</Text>
              </VStack>
            </HStack>
            <Button
              bg="#7F61D3"
              rounded="18px"
              fontSize="lg"
              fontWeight="medium"
              color="white"
              px={16}
              py={7}
              _hover={{ opacity: 0.8 }}
              _active={{ opacity: 0.6 }}
              _focus={{ outline: 'none' }}
            >
              Try it out for yourself
            </Button>
          </VStack>
          <VStack spacing={8}>
            <VStack spacing={1}>
              <Heading fontSize="5xl">Kytelink tracks analytics for you.</Heading>
              <Heading pb={1} fontSize="5xl">
                No 3rd parties needed.
              </Heading>
              <Text fontSize="2xl" textAlign="center" color="gray.600">
                Page Views, Traffic Sources, Link Clicks, Etc.
              </Text>
            </VStack>
            <HStack w="55rem" spacing={4} h="full">
              <TrafficSources trafficSources={ANAL?.trafficSources} isLandingPage={true} />

              <VStack spacing={5} w="full">
                <PageViews totalPageViews={ANAL?.totalHits} />

                <TimeSeries timeSeries={ANAL.timeSeriesData} />
              </VStack>
            </HStack>
          </VStack>
          <VStack spacing={4}>
            <Heading fontSize="5xl">Everything is open-source</Heading>
            <Text fontSize="2xl" textAlign="center" color="gray.600" w="60%">
              Our source code is available on GitHub - feel free to read, review, or contribute to
              it however you want!
            </Text>
            <Button bg="black" color="white" rounded="18px" px={16} py={7}>
              Star us on GitHub
            </Button>
          </VStack>
          <VStack spacing={8} pb={16}>
            <Image src="/logo.png" h={12}></Image>
            <Text textColor="#898989">Designed with love. Built with coffee.</Text>
          </VStack>
        </VStack>
      </VStack>
    </>
  )
}

export default Home

{
  /* <VStack spacing={8}>
<Image src="/logo.png" h={12}></Image>
<Text textColor="#898989">Designed with love. Built with coffee.</Text>
</VStack> */
}
