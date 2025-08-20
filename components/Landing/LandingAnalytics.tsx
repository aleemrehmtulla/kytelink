import { VStack, Heading, Text, Stack } from '@chakra-ui/react'
import PageViews from 'components/Editor/Config/Analytics/PageViews'
import TimeSeries from 'components/Editor/Config/Analytics/TimeSeries'
import TrafficSources from 'components/Editor/Config/Analytics/TrafficSources'
import { LANDING_ANALYITCS } from 'consts/landingpage'

const LandingAnalytics = () => {
  return (
    <VStack spacing={8}>
      <VStack spacing={1} textAlign="center">
        <Heading fontSize={{ base: '3xl', md: '4xl', lg: '5xl' }}>Powerful Analytics.</Heading>
        <Heading pb={1} fontSize={{ base: '3xl', md: '4xl', lg: '5xl' }}>
          Track Every Click.
        </Heading>
        <Text fontSize={{ base: 'md', md: 'xl', lg: '2xl' }} textAlign="center" color="gray.600">
          Detailed insights to optimize your business conversions.
        </Text>
      </VStack>
      <Stack
        w={{ base: '100%', md: '30rem', lg: '55rem' }}
        spacing={4}
        h="full"
        direction={{ base: 'column', lg: 'row' }}
      >
        <TrafficSources trafficSources={LANDING_ANALYITCS?.trafficSources} isLandingPage={true} />

        <VStack spacing={6} w="full">
          <PageViews totalPageViews={LANDING_ANALYITCS?.totalHits} />
          <TimeSeries timeSeries={LANDING_ANALYITCS.timeSeriesData} />
        </VStack>
      </Stack>
    </VStack>
  )
}

export default LandingAnalytics
