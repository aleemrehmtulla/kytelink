import { useEffect, useState } from 'react'

import { Modal, ModalBody, ModalCloseButton, ModalContent, ModalOverlay } from '@chakra-ui/react'

import { TUser } from 'types/user'

import SelectAvatar from './SelectAvatar'
import SelectName from './SelectName'
import SelectUsername from './SelectUsername'
import { trackClientEvent } from 'lib/posthog'
import { PosthogEvents } from 'consts/posthog'

type GetStartedModalProps = {
  isNewUser: boolean
  modalOpen: boolean
  setModalOpen: (modalOpen: boolean) => void
  user: TUser
  setUser: (user: TUser) => void
}

export enum MODAL_TYPE {
  selectUsername = 'selectUsername',
  selectAvatar = 'selectAvatar',
  selectName = 'selectName',
  done = 'done',
}

const GetStartedModal = ({ modalOpen, setModalOpen, user, setUser }: GetStartedModalProps) => {
  const [modalType, setModalType] = useState(MODAL_TYPE.selectUsername)

  useEffect(() => {
    if (modalType === MODAL_TYPE.done) setModalOpen(false)
  }, [modalType])

  return (
    <Modal
      isOpen={modalOpen}
      onClose={() => {
        setModalOpen(false)
      }}
      size="2xl"
    >
      <ModalOverlay brightness={1} />
      <ModalContent mt={{ base: '30%', md: '15%' }} mx={4}>
        <ModalCloseButton _focus={{ outline: 'none' }} onClick={() => setModalOpen(true)} />
        <ModalBody pb={20} px={{ base: 4, md: 20 }}>
          {modalType === MODAL_TYPE.selectUsername && (
            <SelectUsername user={user} setUser={setUser} setModalType={setModalType} />
          )}
          {modalType === MODAL_TYPE.selectAvatar && (
            <SelectAvatar user={user} setUser={setUser} setModalType={setModalType} />
          )}
          {modalType === MODAL_TYPE.selectName && (
            <SelectName user={user} setUser={setUser} setModalType={setModalType} />
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

export default GetStartedModal
