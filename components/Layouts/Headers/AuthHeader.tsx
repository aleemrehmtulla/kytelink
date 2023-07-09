import { Text, Spacer, HStack, Container, Link, Flex } from '@chakra-ui/react'
import { useRouter } from 'next/router'

const AuthHeader = ({ isSignup }: { isSignup: boolean }) => {
  const router = useRouter()
  return (
    <HStack
      position="fixed"
      w="full"
      top={0}
      left={0}
      zIndex={100}
      bgColor="white"
      borderBottom="1px"
      borderColor="gray.200"
      justifyContent="center"
      as="nav"
      h="72px"
      px={4}
    >
      <Container maxW="container.2xl">
        <Flex alignItems="center" px={{ base: 0, md: 8 }}>
          <Text
            onClick={() => router.push('/')}
            cursor="pointer"
            fontSize={{ base: '2xl', md: '4xl' }}
            w="3rem"
          >
            🪁
          </Text>
          <Spacer />
          <HStack spacing={1} justifyContent="flex-end">
            <Text fontSize={{ base: 'xs', md: 'lg' }}>
              {isSignup ? 'Already Have an Account?' : "Don't have an Account?"}
            </Text>
            <Link
              fontSize={{ base: 'sm', md: 'lg' }}
              href={isSignup ? '/login' : '/signup'}
              textDecor="underline"
              _hover={{ opacity: 0.8 }}
              color="blue.400"
            >
              {isSignup ? 'Sign in' : 'Sign up'}
            </Link>
          </HStack>
        </Flex>
      </Container>
    </HStack>
  )
}

export default AuthHeader
