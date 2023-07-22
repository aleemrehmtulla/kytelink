import { HStack, Text, Heading, Button } from '@chakra-ui/react'
import { IoIosArrowForward } from 'react-icons/io'

const MainContent = () => {
  return (
    <>
      <Heading
        fontSize={{ base: '4xl', md: '6xl' }}
        color="black"
        fontWeight="extrabold"
        lineHeight="shorter"
        textDecor="underline #6B46C1 6px"
      >
        A simple Linktree alternative
      </Heading>
      <Text fontSize={{ base: 'md', md: 'xl' }} color="gray.600" w="90%">
        Kytelink is a free platform that allows you to share all your links in one place. We support
        custom domains, detailed click statistics, over 9 themes and more.
      </Text>
      <HStack spacing={4}>
        <Button
          bg="purple.600"
          color="white"
          rounded="full"
          size="lg"
          px={{ base: 6, md: 8 }}
          py={{ base: 2, md: 4 }}
          transitionDuration="300ms"
          _hover={{ opacity: 0.8 }}
          _active={{ opacity: 0.5 }}
          _focus={{ outline: 'none' }}
          as="a"
          href="/signup"
        >
          Get Started
        </Button>

        <Button
          rounded="full"
          size="lg"
          variant="link"
          fontSize={{ base: 'md', md: 'xl' }}
          py={{ base: 2, md: 4 }}
          transitionDuration="300ms"
          _hover={{ opacity: 0.8 }}
          _active={{ opacity: 0.5 }}
          _focus={{ outline: 'none' }}
          as="a"
          href="/isuma"
          target="_blank"
        >
          View Example <IoIosArrowForward />
        </Button>
      </HStack>
    </>
  )
}
export default MainContent
