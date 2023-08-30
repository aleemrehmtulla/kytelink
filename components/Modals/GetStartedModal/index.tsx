import { Modal, ModalBody, ModalCloseButton, ModalContent, ModalOverlay } from '@chakra-ui/react'
import { Avatar, Box, Button, Heading, HStack, Input, Text, VStack } from '@chakra-ui/react'

import { TUser } from 'types/user'

import SelectUsername from './SelectUsername'
import { FaArrowRight } from 'react-icons/fa'
import StarterLinks from './StarterLinks'
import NameDescription from './NameDescription'
import SelectAvatar from './SelectAvatar'
import { useState } from 'react'

type GetStartedModalProps = {
  modalOpen: boolean
  setModalOpen: (modalOpen: boolean) => void
  user: TUser
  setUser: (user: TUser) => void
}

const GetStartedModal = ({ modalOpen, setModalOpen, user, setUser }: GetStartedModalProps) => {
  const [saving, setSaving] = useState<boolean>(false)

  const handleSave = () => {
    setSaving(true)
    setTimeout(() => {
      setSaving(false)
      setModalOpen(false)
    }, 2000)
  }

  return (
    <Modal
      isOpen={modalOpen}
      onClose={() => {
        setModalOpen(true)
      }}
      size="4xl"
      isCentered
    >
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
            <SelectUsername user={user} setUser={setUser} />
            {/* <HStack w="full" spacing={8}> */}
            {/* <SelectAvatar user={user} setUser={setUser} /> */}
            <NameDescription user={user} setUser={setUser} />
            {/* </HStack> */}

            <StarterLinks user={user} setUser={setUser} />

            <Button
              w="48"
              textColor="white"
              bg="black"
              onClick={handleSave}
              isLoading={saving}
              _hover={{ bg: 'gray.900' }}
              _active={{ bg: 'gray.800' }}
              _focus={{ outline: 'none' }}
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
