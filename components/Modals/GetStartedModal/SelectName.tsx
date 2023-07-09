import { useState } from 'react'

import { Button, Heading, Input, Text, VStack } from '@chakra-ui/react'

import { TUser } from 'types/user'
import { MODAL_TYPE } from '.'

type GetStartedModalProps = {
  user: TUser
  setUser: (user: TUser) => void
  setModalType: (modalType: MODAL_TYPE) => void
}

const SelectName = ({ user, setUser, setModalType }: GetStartedModalProps) => {
  const [loading, setLoading] = useState(false)

  const finishSetup = async () => {
    setLoading(true)
    setTimeout(async () => {
      setModalType(MODAL_TYPE.done)
      setLoading(false)
      await fetch('/api/publishkyte')
    }, 1000)
  }

  return (
    <>
      <VStack align="center" textAlign="center" pt={12} spacing={4}>
        <Heading fontSize={{ base: 'lg', md: 'xl' }}>🎉 Your Kyte is live 🎉</Heading>
        <Text fontSize={{ base: 'sm', md: 'md' }}>Finish off with your display name!</Text>
        <VStack align="left" spacing={4} w={{ base: 'fit', md: '20rem' }}>
          <VStack spacing={2}>
            <Input
              _hover={{ bg: 'gray.100' }}
              _focus={{ bg: 'gray.100', borderColor: 'gray.400' }}
              borderColor="gray.300"
              transitionDuration="350ms"
              placeholder="Martin Jackson"
              onChange={(e) => {
                setUser({ ...user, name: e.target.value })
              }}
            />
            <Input
              _hover={{ bg: 'gray.100' }}
              _focus={{ bg: 'gray.100', borderColor: 'gray.400' }}
              borderColor="gray.300"
              transitionDuration="350ms"
              placeholder="SWE @ Kyte | Shoot me a DM to chat!"
              onChange={(e) => {
                setUser({ ...user, description: e.target.value })
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  finishSetup()
                }
              }}
            />
          </VStack>

          <Button
            marginTop={8}
            bg="black"
            color="white"
            onClick={finishSetup}
            isLoading={loading}
            _hover={{ opacity: 0.8, transform: 'scale(1.01)' }}
            _active={{ opacity: 0.6, transform: 'scale(0.99)' }}
            _focus={{ boxShadow: 'none' }}
            transitionDuration="0.5s"
          >
            Finish 🍾
          </Button>
        </VStack>
      </VStack>
    </>
  )
}

export default SelectName
