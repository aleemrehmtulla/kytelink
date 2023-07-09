/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from 'react'

import { VStack, Text, InputGroup, InputLeftAddon, Input, Box, useToast } from '@chakra-ui/react'
import { debounce } from 'lodash'

import { TUser } from 'types/user'

const EditUsername = ({ user, setUser }: { user: TUser; setUser: (user: TUser) => void }) => {
  const [username, setUsername] = useState('???') as any
  const [errorMessage, setErrorMessage] = useState('')
  const [isValid, setIsValid] = useState(true) as any

  const handleSaveUsername = async (username: string) => {
    const lowercasedUsername = username.toLowerCase()

    const valid = await validator(lowercasedUsername)

    if (valid) setUser({ ...user, username: lowercasedUsername })
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
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

    // if name does not completely match the regex, then return
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
    setUsername(user.username)
  }, [user])

  return (
    <VStack
      pr={{
        base: 0,
        md: '30%',
      }}
      align="left"
      spacing={2}
    >
      <Text fontWeight="semibold">Kyte Username</Text>
      <Box>
        <InputGroup size="sm">
          <InputLeftAddon children="kytelink.com/" />
          <Input
            _hover={{
              bg: 'gray.100',
            }}
            _focus={{
              bg: 'gray.100',
              borderColor: isValid === null ? 'gray.500' : isValid ? 'green.500' : 'red.500',
            }}
            borderColor={isValid === null ? 'gray.300' : isValid ? 'green.600' : 'red.500'}
            transitionDuration="350ms"
            placeholder="aleem"
            onChange={(e) => {
              setUsername(e.target.value)
              saveDebouncer(e.target.value)
            }}
            value={username}
          />
        </InputGroup>
        <Text pt={1} fontSize="xs" color="red.300">
          {errorMessage}
        </Text>
      </Box>
    </VStack>
  )
}
export default EditUsername
