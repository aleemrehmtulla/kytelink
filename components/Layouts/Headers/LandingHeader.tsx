import { Text, Spacer, HStack, Container, Link, Button, Flex } from '@chakra-ui/react'
import { useRouter } from 'next/router'

const LandingHeader = () => {
  const router = useRouter()

  return (
    <>
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
            <HStack w="full" spacing={4} justifyContent="flex-end">
              <Link
                fontSize={{ base: 'md', lg: 'lg' }}
                color="black"
                fontWeight="bold"
                onClick={async () => await router.push('/login')}
              >
                Login
              </Link>
              <Button
                bg="black"
                color="white"
                rounded="lg"
                h="fit"
                w="fit"
                px={4}
                py={1.5}
                fontSize={{ base: 'sm', lg: 'lg' }}
                _hover={{ opacity: 0.8 }}
                _active={{ opacity: 0.5 }}
                _focus={{ outline: 'none' }}
                transitionDuration="400ms"
                onClick={async () => await router.push('/signup')}
              >
                Sign Up
              </Button>
            </HStack>
          </Flex>
        </Container>
      </HStack>
    </>
  )
}

export default LandingHeader
