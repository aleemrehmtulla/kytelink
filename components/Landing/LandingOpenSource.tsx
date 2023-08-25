import { Button, Heading, Text, VStack } from '@chakra-ui/react'

const LandingOpenSource = () => {
  const GITHUB_REPO = 'https://github.com/aleemrehmtulla/kytelink'
  return (
    <VStack spacing={4}>
      <Heading fontSize={{ base: '2xl', md: '6xl' }}>Everything is open-source</Heading>
      <Text
        fontSize={{ base: 'md', md: 'xl' }}
        textAlign="center"
        color="gray.600"
        w={{ base: '100%', md: '60%' }}
        px={{ base: 4, md: 0 }}
      >
        Our source code is available on GitHub - feel free to read, review, or contribute to it
        however you want!
      </Text>
      <Button
        bg="black"
        color="white"
        rounded="18px"
        px={16}
        py={7}
        _hover={{ opacity: 0.8 }}
        _active={{ opacity: 0.5 }}
        _focus={{ outline: 'none' }}
        as="a"
        href={GITHUB_REPO}
        target="_blank"
      >
        Star us on GitHub
      </Button>
    </VStack>
  )
}

export default LandingOpenSource
