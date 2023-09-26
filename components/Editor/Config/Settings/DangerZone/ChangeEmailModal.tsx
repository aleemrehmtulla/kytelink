import {
  Button,
  Heading,
  HStack,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalOverlay,
  Text,
  VStack,
} from '@chakra-ui/react'
import { signOut } from 'next-auth/react'
import { useState } from 'react'

type ChangeEmailModalProps = {
  modalOpen: boolean
  setModalOpen: (modalOpen: boolean) => void
  email?: string
}

const ChangeEmailModal = ({ modalOpen, setModalOpen, email }: ChangeEmailModalProps) => {
  const [buttonLoading, setButtonLoading] = useState(false)

  const handleChangeEmail = async () => {
    setButtonLoading(true)

    await fetch('/api/swapemail', {
      method: 'POST',
      body: JSON.stringify({ email }),
      headers: { 'Content-Type': 'application/json' },
    })

    // the cons of wicked fast apis :)!
    setTimeout(() => {
      setButtonLoading(false)
      setTimeout(() => {
        signOut({ callbackUrl: '/login' })
      }, 500)
    }, 1500)
  }

  return (
    <Modal
      isOpen={modalOpen}
      size="2xl"
      onClose={() => {
        setModalOpen(false)
      }}
    >
      <ModalOverlay brightness={1} />
      <ModalContent mt={{ base: '30%', md: '15%' }} mx={4}>
        <ModalCloseButton onClick={() => setModalOpen(true)} />
        <ModalBody pb={20} px={{ base: 4, md: 20 }}>
          <VStack pt={12} spacing={6} align="center">
            <Heading fontSize={{ base: 'xl', md: '2xl' }} textAlign="center" fontWeight="bold">
              This is an irreversible action ⚠️
            </Heading>
            <Text textAlign="center" fontSize={{ base: 'md', md: 'lg' }} fontWeight="medium">
              Changing your email will log you out of all devices. You will need to log back in with
              your new email address.
            </Text>
            <Text textAlign="center" fontSize={{ base: 'md', md: 'lg' }} fontWeight="medium">
              Your new email address will be:{' '}
              <Text as="span" fontWeight="bold" color="blue.500">
                {email}
              </Text>
            </Text>

            <HStack>
              <Button colorScheme="red" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button colorScheme="blue" onClick={handleChangeEmail} isLoading={buttonLoading}>
                Change email
              </Button>
            </HStack>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

export default ChangeEmailModal
