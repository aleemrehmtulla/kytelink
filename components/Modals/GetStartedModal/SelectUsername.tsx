import { HStack, Input, Text, VStack } from '@chakra-ui/react'
import { TUser } from 'types/user'
import { useState, useCallback, useEffect } from 'react'
import { debounce } from 'lodash'

type SelectUsernameProps = {
  user: TUser
  setUser: (user: TUser) => void
  username: string
  setUsername: (username: string) => void
  isValid: boolean | null
  setIsValid: (isValid: boolean | null) => void
}

const SelectUsername = ({
  user,
  setUser,
  username,
  setUsername,
  isValid,
  setIsValid,
}: SelectUsernameProps) => {
  const [errorMessage, setErrorMessage] = useState<string>('')

  const handleSaveUsername = async (username: string, shouldSave?: boolean) => {
    const lowercasedUsername = username.toLowerCase()

    const valid = await validator(lowercasedUsername)

    if (valid) {
      setUser({ ...user, username: lowercasedUsername })
    } else {
      setIsValid(false)
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

  return (
    <VStack align="left" pt={0} w="full">
      <HStack>
        <Text fontSize="md" textAlign="left" textColor="gray.700" fontWeight="semibold">
          Username
        </Text>
        <Text fontSize="sm" textColor="red.500" fontWeight="normal">
          (required)
        </Text>
      </HStack>
      <VStack spacing={0} w="full" align="left">
        <Input
          _hover={{ bg: 'gray.100' }}
          _focus={{
            bg: 'gray.100',
            borderColor: isValid === null ? 'gray.500' : isValid ? 'green.500' : 'red.500',
          }}
          borderColor={isValid === null ? 'gray.300' : isValid ? 'green.600' : 'red.500'}
          transitionDuration="350ms"
          placeholder="logan"
          value={username}
          onChange={(e) => {
            setUsername(e.target.value)
            saveDebouncer(e.target.value)
          }}
        />
        <Text align="left" pt={1} pb={2} h="2" fontSize="12" color="red.300">
          {errorMessage}{' '}
        </Text>
      </VStack>
    </VStack>
  )
}

export default SelectUsername
