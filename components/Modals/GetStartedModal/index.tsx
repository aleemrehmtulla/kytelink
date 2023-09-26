import { Modal, ModalBody, ModalContent, ModalOverlay, useToast } from '@chakra-ui/react'
import { Box, Button, Heading, Text, VStack } from '@chakra-ui/react'

import { TUser } from 'types/user'

import SelectUsername from './SelectUsername'
import { FaArrowRight } from 'react-icons/fa'
import StarterLinks from './StarterLinks'
import NameDescription from './NameDescription'
import { useState } from 'react'

type GetStartedModalProps = {
  modalOpen: boolean
  setModalOpen: (modalOpen: boolean) => void
  user: TUser
  setUser: (user: TUser) => void
}

const GetStartedModal = ({ modalOpen, setModalOpen, user, setUser }: GetStartedModalProps) => {
  const toast = useToast()
  const [username, setUsername] = useState<string>('')
  const [isValid, setIsValid] = useState<boolean | null>(null)

  const [saving, setSaving] = useState<boolean>(false)

  const handleSave = async () => {
    setSaving(true)

    if (!isValid || !username) {
      toast({ title: 'Valid username is required', status: 'error' })
      setSaving(false)
      return
    }
    if (!user.pfp) {
      toast({ title: 'Avatar is required', status: 'error' })
      setSaving(false)
      return
    }
    if (!user.name) {
      toast({ title: 'Name is required', status: 'error' })
      setSaving(false)
      return
    }
    if (!user.links || user.links.length < 1) {
      toast({ title: 'At least one link is required', status: 'error' })
      setSaving(false)
      return
    }

    await fetch('/api/publishkyte')

    setTimeout(() => {
      setSaving(false)
      setTimeout(() => {
        setModalOpen(false)
      }, 500)
    }, 2000)
  }

  return (
    <Modal isOpen={modalOpen} onClose={() => {}} size="4xl" isCentered>
      <ModalOverlay brightness={1} />
      <ModalContent mx={32}>
        <ModalBody px={{ base: 4, md: 20 }}>
          <VStack py={8} align="left" spacing={5} w={{ base: 'fit', md: 'full' }}>
            <VStack align="left" spacing={2} w="full">
              <Heading textAlign="left" color="black" fontSize="3xl">
                Let's start with the basics
              </Heading>
              <Text textAlign="left" color="gray.500" fontSize="md">
                You can always change these later :)!
              </Text>
            </VStack>

            <SelectUsername
              user={user}
              setUser={setUser}
              username={username}
              setUsername={setUsername}
              isValid={isValid}
              setIsValid={setIsValid}
            />

            <NameDescription user={user} setUser={setUser} />

            <StarterLinks user={user} setUser={setUser} />

            <Button
              w="48"
              textColor="white"
              bg="black"
              onClick={handleSave}
              isLoading={saving}
              _hover={{ bg: 'gray.900' }}
              _active={{ bg: 'gray.800' }}
            >
              Continue to Kytelink <Box as={FaArrowRight} pl={2} size="20px" />
            </Button>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

export default GetStartedModal
