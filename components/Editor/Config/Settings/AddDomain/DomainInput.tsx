import { useState } from 'react'

import { Button, VStack, Text, Input, InputGroup, InputLeftAddon } from '@chakra-ui/react'

import { TUser } from 'types/user'

type DomainInputProps = {
  user: TUser
  setUser: (userData: TUser) => void
  domain: string
  setDomain: (domain: string) => void
  setAddingDomain: (addingDomain: boolean) => void
}

const DomainInput = ({ user, setUser, domain, setDomain, setAddingDomain }: DomainInputProps) => {
  const [errorMessage, setErrorMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [input, setInput] = useState('')
  const pattern = /[a-zA-Z0-9]+\.[a-zA-Z0-9]+/

  const validateDomain = async () => {
    setLoading(true)
    setTimeout(async () => {
      if (input.length < 2) {
        setErrorMessage('Ensure ya enter a domain!')
        setLoading(false)
        return
      }
      if (!input.match(pattern)) {
        setErrorMessage('Invalid domain')
        setLoading(false)
        return
      }
      setErrorMessage('')
      setDomain(input)

      await fetch('/api/domains/adddomain', {
        method: 'POST',
        body: JSON.stringify({ domain: input }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const newDomains = user.domains ? [...user.domains, input] : [input]
      setUser({ ...user, domains: newDomains })

      setAddingDomain(false)

      setLoading(false)
    }, 400)
  }

  return (
    <VStack align="left" w="full" spacing={2}>
      <InputGroup w="full" size="sm">
        <InputLeftAddon children="https://" />
        <Input
          placeholder="aleem.com"
          _focus={{
            boxShadow: 'none',
          }}
          onChange={(e) => setInput(e.target.value.toLowerCase())}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              validateDomain()
            }
          }}
        />
      </InputGroup>
      <Text color="red.500" fontSize="sm">
        {errorMessage}
      </Text>

      <Button
        size="sm"
        _focus={{
          boxShadow: 'none',
        }}
        w="100%"
        onClick={validateDomain}
        isLoading={loading}
        mt={2}
      >
        Add
      </Button>
    </VStack>
  )
}
export default DomainInput
