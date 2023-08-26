import { VStack, Heading, Text, Stack } from '@chakra-ui/react'
import PageViews from 'components/Editor/Config/Analytics/PageViews'
import TimeSeries from 'components/Editor/Config/Analytics/TimeSeries'
import TrafficSources from 'components/Editor/Config/Analytics/TrafficSources'
const LandingAnalytics = () => {
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
  return (
    <VStack spacing={8}>
      <VStack spacing={1} textAlign="center">
        <Heading fontSize={{ base: '3xl', md: '4xl', lg: '5xl' }}>Charts and Graphs.</Heading>
        <Heading pb={1} fontSize={{ base: '3xl', md: '4xl', lg: '5xl' }}>
          No 3rd parties needed.
        </Heading>
        <Text fontSize={{ base: 'md', md: 'xl', lg: '2xl' }} textAlign="center" color="gray.600">
          Page Views, Traffic Sources, Link Clicks, Etc.
        </Text>
      </VStack>
      <Stack
        w={{ base: '100%', md: '30rem', lg: '55rem' }}
        spacing={4}
        h="full"
        direction={{ base: 'column', lg: 'row' }}
      >
        <TrafficSources trafficSources={ANAL?.trafficSources} isLandingPage={true} />

        <VStack spacing={6} w="full">
          <PageViews totalPageViews={ANAL?.totalHits} />
          <TimeSeries timeSeries={ANAL.timeSeriesData} />
        </VStack>
      </Stack>
    </VStack>
  )
}

export default LandingAnalytics
