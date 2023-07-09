import { Heading, HStack, Link, Spacer, Spinner, Text, VStack } from '@chakra-ui/react'
import { GetTrafficSourcesReturnData } from 'controllers/analytics'

type TrafficSourcesProps = { trafficSources: GetTrafficSourcesReturnData | undefined }

const TrafficSources = ({ trafficSources }: TrafficSourcesProps) => {
  return (
    <VStack
      align="left"
      w="full"
      border="1px"
      borderColor="gray.200"
      rounded="lg"
      p={4}
      spacing={4}
    >
      <Heading fontSize="2xl">Top Traffic Sources</Heading>

      <VStack>
        {trafficSources && trafficSources.length === 0 && (
          <HStack
            w="full"
            border={1}
            borderColor="gray.200"
            borderStyle="dashed"
            p={4}
            rounded="lg"
          >
            <Text fontWeight="semibold" fontSize="sm">
              No traffic sources yet!
            </Text>
          </HStack>
        )}
        {trafficSources &&
          trafficSources.map((trafficSource: { referrer: string; count: number }) => (
            <HStack w="full" px={3} rounded="md" bg="gray.100" key={trafficSource.referrer}>
              <VStack align="left">
                <Text fontWeight="semibold" fontSize="sm">
                  {trafficSource.referrer.replace(/(https?:\/\/)?(www\.)?/i, '').split('/')[0]}
                </Text>
                <Link href={trafficSource.referrer} fontSize="xs">
                  {trafficSource.referrer.length > 40
                    ? trafficSource.referrer.slice(0, 42) + '...'
                    : trafficSource.referrer}
                </Link>
              </VStack>
              <Spacer />
              <VStack py={4} spacing={0}>
                <Text fontWeight="bold" fontSize="lg">
                  {trafficSource.count}
                </Text>
                <Text> {trafficSource.count === 1 ? 'click' : 'clicks'}</Text>
              </VStack>
            </HStack>
          ))}

        {!trafficSources && <Spinner size="lg" />}
      </VStack>
    </VStack>
  )
}

export default TrafficSources
