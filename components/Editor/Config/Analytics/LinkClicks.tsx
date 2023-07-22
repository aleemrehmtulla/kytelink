import { Heading, HStack, Link, Spacer, Spinner, Text, VStack } from '@chakra-ui/react'

type LinkClick = { url: string; title: string; count: number }
type LinkClicksProps = { totalLinkClicks: LinkClick[] | undefined }

const LinkClicks = ({ totalLinkClicks }: LinkClicksProps) => {
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
      <Heading fontSize="2xl">Top Link Clicks</Heading>

      <VStack>
        {totalLinkClicks && totalLinkClicks.length === 0 && (
          <HStack
            w="full"
            border={1}
            borderColor="gray.200"
            borderStyle="dashed"
            p={4}
            rounded="lg"
          >
            <Text fontWeight="semibold" fontSize="sm">
              No links have been clicked yet!
            </Text>
          </HStack>
        )}
        {totalLinkClicks &&
          totalLinkClicks.map((link: LinkClick) => (
            <>
              <HStack w="full" px={3} rounded="md" bg="gray.100" key={link.url}>
                <VStack align="left">
                  <Text fontWeight="semibold" fontSize="sm">
                    {link.title}
                  </Text>
                  <Link href={link.url} fontSize="xs" w={{ base: '36', md: '72' }} isTruncated>
                    {link.url.length > 40 ? link.url.slice(0, 42) + '...' : link.url}
                  </Link>
                </VStack>
                <Spacer />
                <VStack py={4} spacing={0}>
                  <Text fontWeight="bold" fontSize="lg">
                    {link.count}
                  </Text>
                  <Text> {link.count === 1 ? 'click' : 'clicks'}</Text>
                </VStack>
              </HStack>
            </>
          ))}

        {!totalLinkClicks && <Spinner size="lg" />}
      </VStack>
    </VStack>
  )
}

export default LinkClicks
