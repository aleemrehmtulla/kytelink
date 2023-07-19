import { useState } from 'react'

import {
  Button,
  Heading,
  HStack,
  VStack,
  Text,
  Box,
  Input,
  Center,
  useToast,
  Image,
  Link,
} from '@chakra-ui/react'
import { debounce } from 'lodash'
import { signIn } from 'next-auth/react'

import { getBaseURL } from 'utils/utils'
import { IoIosArrowBack } from 'react-icons/io'
import { FaArrowRight, FaGithub, FaGoogle } from 'react-icons/fa'
import { NextSeo } from 'next-seo'

type AuthComponentProps = {
  isSignup: boolean
}

const PROVIDERS = [
  { name: 'Google', icon: FaGoogle, color: 'blue.500' },
  { name: 'Github', icon: FaGithub, color: 'gray.800' },
]

const AuthComponent = ({ isSignup }: AuthComponentProps) => {
  const toast = useToast()

  const [email, setEmail] = useState<string>('')
  const [emailLoading, setEmailLoading] = useState<boolean>(false)
  const [isValid, setIsValid] = useState<boolean | null>(null)

  const validateDebouncer = debounce((name) => {
    validate(name)
  }, 200)

  const validate = async (name: string) => {
    if (!name || name.length < 3) {
      setIsValid(false)
      return false
    }

    if (!name.match(/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/)) {
      setIsValid(false)
      return false
    }

    setIsValid(true)
    setEmail(name)
    return true
  }

  const authSocial = async (provider: string) => {
    const BASE_URL = getBaseURL(window.location.hostname)

    console.log('authing with', provider)
    console.log(BASE_URL)
    await signIn(provider, {
      callbackUrl: `${BASE_URL}/edit`,
    })
  }

  const authEmail = async () => {
    const BASE_URL = getBaseURL(window.location.hostname)

    setEmailLoading(true)

    const isValid = await validate(email)
    if (!isValid) {
      setEmailLoading(false)
      toast({ title: 'Invalid email', status: 'error', duration: 3000 })
      return
    }

    await signIn('email', {
      email,
      callbackUrl: `${BASE_URL}/edit`,
    })

    setTimeout(() => {
      setEmailLoading(false)
    }, 1000)
  }

  return (
    <>
      <NextSeo title={`${isSignup ? 'Sign up' : 'Log in'} | Kytelink`} />

      <Center h={{ base: '90vh', md: '100vh' }} px={{ base: 5, md: 8 }}>
        <Box pos="absolute" top="0" left="0" px={{ base: 0, md: 8 }} py={4} cursor="pointer">
          <a href="/">
            <HStack
              _hover={{ background: 'gray.100' }}
              rounded="full"
              p={2}
              px={4}
              transitionDuration="300ms"
            >
              <IoIosArrowBack color="#374051" />
              <Text fontSize="md" fontWeight="bold" color="gray.700">
                Home
              </Text>
            </HStack>
          </a>
        </Box>

        <VStack spacing={6} w="35rem" align="left">
          <Image src="/logo.png" w={{ base: '2.5rem', md: '3rem' }} />
          <VStack spacing={1} align="left">
            <Heading fontSize={{ base: '2xl', md: '4xl' }} color="black">
              {isSignup ? 'Create a Kytelink' : 'Log in to Kytelink'}
            </Heading>
            <Text>
              {isSignup ? 'Already have an account? ' : "Don't have an account? "}
              <Link
                href={isSignup ? '/login' : '/signup'}
                color="blue.500"
                _focus={{ outline: 'none' }}
              >
                {isSignup ? 'Log in' : 'Sign up'}
              </Link>
            </Text>
          </VStack>

          <VStack spacing={3}>
            <Input
              _hover={{ bg: 'gray.100' }}
              _focus={{
                bg: 'gray.100',
                borderColor: isValid === null ? 'gray.500' : isValid ? 'green.500' : 'red.500',
              }}
              borderColor={isValid === null ? 'gray.300' : isValid ? 'green.600' : 'red.500'}
              transitionDuration="350ms"
              onChange={(e) => {
                validateDebouncer(e.target.value)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') authEmail()
              }}
              placeholder="nikola.tesla@example.com"
            />
            <Button
              w="full"
              textColor="white"
              _hover={isValid !== false && !emailLoading ? { opacity: 0.8 } : {}}
              _active={isValid !== false && !emailLoading ? { opacity: 0.5 } : {}}
              _focus={{ outline: 'none' }}
              transition="0.3s"
              bg="purple.600"
              onClick={authEmail}
              isLoading={emailLoading}
              isDisabled={isValid === null ? false : isValid === false ? true : false}
            >
              Continue <Box as={FaArrowRight} pl={2} size="20px" />
            </Button>
          </VStack>

          <HStack>
            <Box bg="gray.300" w="full" h="1px" />
            <Text px={8}>or</Text>
            <Box bg="gray.300" w="full" h="1px" />
          </HStack>

          <VStack spacing={3}>
            {PROVIDERS.map((item, i) => (
              <Button
                key={i}
                bg={item.color}
                textColor="white"
                w="full"
                _hover={{ opacity: 0.8 }}
                _active={{ opacity: 0.5 }}
                _focus={{ outline: 'none' }}
                onClick={() => authSocial(item.name.toLowerCase())}
              >
                <Box as={item.icon} color="white" size="20px" />
                <Text pl={2}> Continue with {item.name}</Text>
              </Button>
            ))}
          </VStack>
          <Text fontSize="sm" color="gray.500">
            By continuing, you agree to Kytelink's{' '}
            <Link href="/tos.pdf" color="blue.500" _focus={{ outline: 'none' }}>
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy.pdf" color="blue.500" _focus={{ outline: 'none' }}>
              Privacy Policy
            </Link>
            .
          </Text>
        </VStack>
      </Center>
    </>
  )
}
export default AuthComponent
