import { Heading, Link, Text, VStack } from '@chakra-ui/react'

type ErrorPageProps = {
  code: number | string
  message?: string
}

const ErrorPage = ({ code, message }: ErrorPageProps) => {
  return (
    <VStack bg="white" h="100vh" justifyContent="center" px={{ base: 4, md: 44 }}>
      <VStack py={12} rounded="2xl" textAlign="center">
        <Heading textDecor="underline #6B46C1 6px" fontSize={{ base: '5xl', md: '6xl' }}>
          {code} Error
        </Heading>

        <Text fontSize={{ base: 'md', md: '2xl' }}>
          {message ?? 'Oh no! Looks like something went wrong :('}
        </Text>

        <Text fontSize={{ base: 'sm', md: 'xl' }}>
          dm me on twitter for help:{' '}
          <Link
            href="https://twitter.com/aleemrehmtulla"
            textDecor={'underline'}
            isExternal
            _focus={{ outline: 'none' }}
            _hover={{ opacity: 0.8 }}
          >
            @aleemrehmtulla
          </Link>
        </Text>
      </VStack>
    </VStack>
  )
}

export default ErrorPage
