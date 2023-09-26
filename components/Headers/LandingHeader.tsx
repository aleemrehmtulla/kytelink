import { Spacer, HStack, Container, Link, Button, Flex, Image } from '@chakra-ui/react'
import { PosthogEvents } from 'consts/posthog'
import { trackClientEvent } from 'lib/posthog'
import { useRouter } from 'next/router'
import { MouseEvent } from 'react'

const LandingHeader = () => {
  const router = useRouter()

  const handleLogin = (e: MouseEvent<HTMLElement>, isLogin: boolean) => {
    e.preventDefault()
    trackClientEvent({
      event: isLogin ? PosthogEvents.CLICKED_SIGN_IN : PosthogEvents.CLICKED_SIGN_UP,
    })
    router.push(isLogin ? '/login' : '/signup')
  }

  return (
    <>
      <HStack
        w="full"
        zIndex={100}
        bgColor="white"
        borderBottom="1px"
        borderColor="gray.200"
        justifyContent="center"
        as="nav"
        h="72px"
      >
        <Container maxW="container.2xl" px={{ base: 4, md: 12 }} display="flex" alignItems="center">
          <Image
            boxSize="2rem"
            cursor="pointer"
            src="/logo.png"
            alt="Kytelink Logo"
            onClick={() => router.push('/')}
          />
          <Spacer />
          <HStack w="full" spacing={4} justifyContent="flex-end">
            <Link
              fontSize={{ base: 'md', lg: 'lg' }}
              color="black"
              fontWeight="bold"
              onClick={(e) => handleLogin(e, true)}
              as="a"
              href="/login"
            >
              Login
            </Link>
            <Button
              bg="black"
              color="white"
              rounded="lg"
              px={6}
              py="1.2rem"
              size="sm"
              fontSize={{ base: 'sm', lg: 'lg' }}
              _hover={{ opacity: 0.8 }}
              _active={{ opacity: 0.5 }}
              transitionDuration="200ms"
              onClick={(e) => handleLogin(e, false)}
              as="a"
              href="/signup"
            >
              Sign Up
            </Button>
          </HStack>
        </Container>
      </HStack>
    </>
  )
}

export default LandingHeader
