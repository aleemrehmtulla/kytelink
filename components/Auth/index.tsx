import { useEffect, useState } from 'react'

import {
  Button,
  Divider,
  Heading,
  HStack,
  VStack,
  Text,
  Box,
  Input,
  Center,
  useToast,
} from '@chakra-ui/react'
import { debounce } from 'lodash'
import { signIn } from 'next-auth/react'

import DynamicIcon from '../DynamicIcon'
import { getBaseURL } from 'utils/utils'

type AuthComponentProps = {
  isSignup: boolean
}

const AuthComponent = ({ isSignup }: AuthComponentProps) => {
  const toast = useToast()

  const [email, setEmail] = useState<string>('')
  const [message, setMessage] = useState<string>('')
  const [emailLoading, setEmailLoading] = useState<boolean>(false)
  const [isValid, setIsValid] = useState<boolean | null>(null)

  const validateDebouncer = debounce((name) => {
    validate(name)
  }, 350)

  const validate = async (name: string) => {
    if (!name || name.length < 3) {
      setMessage('No email! Enter one or use a provider below.')
      setIsValid(false)
      return false
    }

    // if name does not completely match the regex, then return
    // eslint-disable-next-line no-useless-escape
    if (!name.match(/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/)) {
      setMessage('Invalid! Enter a valid email one or use a provider below.')
      setIsValid(false)
      return false
    }

    setMessage('')
    setIsValid(true)
    setEmail(name)

    return true
  }

  const authGoogle = async () => {
    const BASE_URL = getBaseURL(window.location.hostname)

    console.log('authing google')
    console.log(BASE_URL)
    await signIn('google', {
      callbackUrl: `${BASE_URL}/edit`,
    })
  }

  const authGithub = async () => {
    const BASE_URL = getBaseURL(window.location.hostname)

    console.log(BASE_URL)
    await signIn('github', {
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
      setMessage('Check your email for a login link!')
      setEmailLoading(false)
    }, 1000)
  }

  return (
    <Center
      w="100%"
      h="100vh"
      px={{
        base: 4,
        md: 8,
      }}
    >
      <VStack mt={{ base: '-12', md: '0' }} spacing={6} rounded="xl" w="35rem" p={4}>
        <Heading fontSize={{ base: '2xl', md: '4xl' }}>
          {isSignup ? "Let's get ya started!" : 'Welcome Back!'}
        </Heading>
        <Box w="full">
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
              if (e.key === 'Enter') {
                authEmail()
              }
            }}
            placeholder="Email"
          />
          <Text h="1" fontSize="xs" color={isValid ? 'green.600' : 'red.300'}>
            {message ? message : '‎ '}
          </Text>
        </Box>
        <Button
          w="full"
          textColor="white"
          _hover={isValid ? { opacity: 0.8 } : {}}
          _active={isValid ? { opacity: 0.5 } : {}}
          _focus={{ outline: 'none' }}
          transition="0.3s"
          bgGradient="linear(to-l, purple.400, purple.500)"
          onClick={authEmail}
          isLoading={emailLoading}
          isDisabled={isValid === null ? false : isValid === false ? true : false}
        >
          {isSignup ? 'Sign up' : 'Sign in'}
        </Button>

        <HStack w="full">
          <Divider />
          <Text px="8">or</Text>
          <Divider />
        </HStack>
        <VStack w="full" spacing={3}>
          <Button
            bg="teal.500"
            textColor="white"
            w="full"
            _hover={{ opacity: 0.8 }}
            _active={{ opacity: 0.5 }}
            _focus={{ outline: 'none' }}
            variant="outline"
            size="md"
            onClick={authGoogle}
          >
            <DynamicIcon color="white" icon="FaGoogle" />
            <Text pl={2}> Continue with Google</Text>
          </Button>
          <Button
            w="full"
            variant="outline"
            size="md"
            _hover={{ opacity: 0.8 }}
            _active={{ opacity: 0.5 }}
            _focus={{ outline: 'none' }}
            textColor="white"
            bg="black"
            onClick={authGithub}
          >
            <DynamicIcon color="white" icon="FaGithub" />
            <Text pl={2}> Continue with Github</Text>
          </Button>
        </VStack>
      </VStack>
    </Center>
  )
}
export default AuthComponent
