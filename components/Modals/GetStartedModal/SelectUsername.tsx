import { useCallback, useEffect, useState } from 'react'

import { Button, Heading, Input, Text, VStack } from '@chakra-ui/react'
import { debounce } from 'lodash'

import { TUser } from 'types/user'
import { MODAL_TYPE } from '.'
import { trackClientEvent } from 'lib/posthog'
import { PosthogEvents } from 'consts/posthog'

type GetStartedModalProps = {
  user: TUser
  setUser: (user: TUser) => void
  setModalType: (modalType: MODAL_TYPE) => void
}

const SelectUsername = ({ user, setUser, setModalType }: GetStartedModalProps) => {
  const [username, setUsername] = useState<string>('')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [isValid, setIsValid] = useState<boolean | null>(null)
  const [loading, setLoading] = useState<boolean>(false)

  const handleSaveUsername = async (username: string, shouldSave?: boolean) => {
    const lowercasedUsername = username.toLowerCase()

    const valid = await validator(lowercasedUsername)

    if (valid) {
      setUser({ ...user, username: lowercasedUsername })
      if (shouldSave) {
        setLoading(true)
        setTimeout(() => {
          setLoading(false)
          setModalType(MODAL_TYPE.selectAvatar)
        }, 1000)
      }
      return
    } else {
      setLoading(false)
      setIsValid(false)
      return
    }
  }

  const saveDebouncer = useCallback(
    debounce((name) => {
      handleSaveUsername(name)
    }, 500),
    []
  )

  const validator = async (name: string) => {
    if (!name) {
      setErrorMessage('Username is required')
      setIsValid(false)
      return false
    }

    if (!name.match(/^[a-zA-Z0-9_\-\.\!]+$/)) {
      setErrorMessage(
        'Only letters, numbers, underscores ("_"), periods (".") and dashes ("-") allowed'
      )
      setIsValid(false)
      return false
    }

    if (name === user.username) {
      setErrorMessage('')
      setIsValid(true)
      return true
    }

    const validateUsername = await fetch('/api/validateusername', {
      method: 'POST',
      body: JSON.stringify({
        username: name,
        userId: user.id,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    })
    const { success, error } = await validateUsername.json()

    if (!success || error) {
      setErrorMessage('Username already taken')
      setIsValid(false)
      return false
    }

    setErrorMessage('')
    setIsValid(true)
    return true
  }

  useEffect(() => {
    if (!user.username) return
    setUsername(user.username)
  }, [user])

  useEffect(() => {
    trackClientEvent({ event: PosthogEvents.ONBOARDING_STEP_1, user })
  }, [])

  return (
    <>
      <VStack align="center" textAlign="center" pt={12} spacing={4}>
        <Heading fontSize={{ base: 'lg', md: 'xl' }}>🎉 Your Kyte is live 🎉</Heading>
        <Text fontSize={{ base: 'sm', md: 'md' }}>Get started by adding a username :)</Text>
        <VStack align="left" spacing={0} w={{ base: 'fit', md: '20rem' }}>
          <Input
            _hover={{ bg: 'gray.100' }}
            _focus={{
              bg: 'gray.100',
              borderColor: isValid === null ? 'gray.500' : isValid ? 'green.500' : 'red.500',
            }}
            borderColor={isValid === null ? 'gray.300' : isValid ? 'green.600' : 'red.500'}
            transitionDuration="350ms"
            placeholder="christopher"
            onChange={(e) => {
              setUsername(e.target.value)
              saveDebouncer(e.target.value)
            }}
            value={username}
          />

          <Text align="left" pt={1} pb={2} fontSize="12" color="red.300">
            {errorMessage}
          </Text>

          <Button
            bg="black"
            color="white"
            isDisabled={!isValid}
            onClick={() => {
              setLoading(true)
              handleSaveUsername(username, true)
            }}
            isLoading={loading}
            _hover={!isValid ? {} : { opacity: 0.8, transform: 'scale(1.01)' }}
            _active={!isValid ? {} : { opacity: 0.6, transform: 'scale(0.99)' }}
            _focus={{ boxShadow: 'none' }}
            transitionDuration="0.5s"
          >
            Continue 👀
          </Button>
        </VStack>
      </VStack>
    </>
  )
}

export default SelectUsername
