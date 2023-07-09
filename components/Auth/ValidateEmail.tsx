import { useState } from 'react'

import { Box, Input, Text } from '@chakra-ui/react'
import { debounce } from 'lodash'

const ValidateEmail = ({ setEmail }: { setEmail: (email: string) => void }) => {
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [isValid, setIsValid] = useState<boolean | null>(null)

  const validateDebouncer = debounce((name) => {
    validate(name)
  }, 500)

  const validate = async (name: string) => {
    if (name.length < 1) {
      setErrorMessage('No email! Either enter one or use one of the services below.')
      setIsValid(false)
      return
    }

    if (!name.match(/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/)) {
      setErrorMessage(
        'Ensure ya entered a valid email address, you can also use one of the services below.'
      )
      setIsValid(false)
      return
    }

    setErrorMessage('')
    setIsValid(true)
    setEmail(name)
  }

  return (
    <>
      <Box>
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
          onChange={(e) => {
            validateDebouncer(e.target.value)
          }}
          placeholder="Email"
        />
        <Text pt={1} fontSize="xs" color="red.300">
          {errorMessage}
        </Text>
      </Box>
    </>
  )
}
export default ValidateEmail
