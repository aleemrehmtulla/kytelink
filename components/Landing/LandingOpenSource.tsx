import { Button, Heading, Text, VStack } from '@chakra-ui/react'
import { FaGithub } from 'react-icons/fa'

const LandingOpenSource = () => {
  const GITHUB_REPO = 'https://github.com/aleemrehmtulla/kytelink'
  return (
    <VStack spacing={4}>
      <Heading fontSize={{ base: '3xl', md: '4xl', lg: '6xl' }}>Free and Open Source.</Heading>
      <Text
        fontSize={{ base: 'md', md: 'lg', lg: 'xl' }}
        textAlign="center"
        color="gray.600"
        w={{ base: '100%', md: '60%' }}
        px={{ base: 4, md: 0 }}
        pb={2}
      >
        Our entire codebase is available on GitHub. Feel free to read, contribute, or fork our code.
      </Text>
      <Button
        bg="black"
        color="white"
        rounded="18px"
        size={'lg'}
        py={{ base: 6, lg: 7 }}
        fontSize={{ base: 'xl', lg: '2xl' }}
        _hover={{ opacity: 0.8 }}
        _active={{ opacity: 0.5 }}
        as="a"
        href={GITHUB_REPO}
        target="_blank"
      >
        <FaGithub size={24} style={{ marginRight: 8 }} />
        Star us on GitHub
      </Button>
    </VStack>
  )
}

export default LandingOpenSource
