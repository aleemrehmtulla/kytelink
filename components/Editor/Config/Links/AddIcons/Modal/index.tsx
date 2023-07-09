import { Modal, ModalOverlay, ModalContent } from '@chakra-ui/react'

import { TUser } from 'types/user'

import AddIcon from './AddIcon'
import SelectedIcon from './SelectedIcon'

type AddIconModalProps = {
  user: TUser
  setUser: (user: TUser) => void
  modalOpen: boolean
  setModalOpen: (modalOpen: boolean) => void
  selectedIcon: any
  setSelectedIcon: (selectedIcon: any) => void
}

const AddIconModal = ({
  user,
  setUser,
  modalOpen,
  setModalOpen,
  setSelectedIcon,
  selectedIcon,
}: AddIconModalProps) => {
  const closeModal = () => {
    setModalOpen(false)
    setSelectedIcon('')
  }
  return (
    <>
      <Modal isOpen={modalOpen} onClose={closeModal} isCentered>
        <ModalOverlay />
        <ModalContent mx={{ base: 2, md: 0 }}>
          {!selectedIcon && (
            <AddIcon user={user} setSelectedIcon={setSelectedIcon} closeModal={closeModal} />
          )}

          {selectedIcon && (
            <SelectedIcon
              user={user}
              setUser={setUser}
              closeModal={closeModal}
              selectedIcon={selectedIcon}
              setSelectedIcon={setSelectedIcon}
            />
          )}
        </ModalContent>
      </Modal>
    </>
  )
}
export default AddIconModal
