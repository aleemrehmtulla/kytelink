import { Heading, Image, Stack, Text, VStack } from '@chakra-ui/react'

const GrabYours = () => {
  return (
    <Stack
      pt={6}
      direction={{ base: 'column', md: 'row' }}
      spacing={{ base: 4, md: 48 }}
      align="center"
    >
      <VStack color="black">
        <Heading fontSize={{ base: '4xl', md: '5xl' }}>Grab an @ now!</Heading>
        <Heading px={1} bg="purple.200" fontSize={{ base: '4xl', md: '5xl' }} fontWeight="black">
          Your unique link
        </Heading>
        <Text fontSize={{ base: '2xl', md: '3xl' }}>or -- host on your own domain!</Text>
      </VStack>
      <VStack>
        <Image w={{ base: '60', md: '96' }} alt="Kyte User Names" src="/assets/landing/names.png" />
      </VStack>
    </Stack>
  )
}
export default GrabYours
