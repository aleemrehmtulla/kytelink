import { Heading, Text, useBreakpointValue, VStack } from '@chakra-ui/react'

const Verify = () => {
  const isMobile = useBreakpointValue({ base: true, md: false })
  return (
    <VStack bg="purple.200" h="100vh" justifyContent="center" px={4}>
      <VStack px={{ base: 4, md: 40 }} py={12} rounded="2xl" textAlign="center">
        <Heading fontSize={{ base: 'md', md: '6xl' }}>Check your email for a login link!</Heading>
        <Text fontSize={{ base: 'xs', md: '2xl' }}>
          it'll come from auth@mail.kytelink.com &nbsp; {isMobile ? `` : '-'} &nbsp; check spam :)
        </Text>
      </VStack>
    </VStack>
  )
}

export default Verify
