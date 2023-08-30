import { useEffect, useState } from 'react'

import { Modal, ModalOverlay, ModalContent } from '@chakra-ui/react'

import { TUser } from 'types/user'

import AddEmojiModal from './AddIconModal'
import EditLinkModal from './EditLinkModal'

type AddLinkModalProps = {
  user: TUser
  setUser: (user: TUser) => void
  modalOpen: boolean
  setModalOpen: (modalOpen: boolean) => void
  isEdit: boolean
  selectedLink?: any
}

const LinkModal = ({
  user,
  setUser,
  modalOpen,
  setModalOpen,
  isEdit,
  selectedLink,
}: AddLinkModalProps) => {
  const [link, setLink] = useState('')
  const [title, setTitle] = useState('')
  const [emoji, setEmoji] = useState('')
  const [color, setColor] = useState('')
  const [addEmoji, setAddEmoji] = useState(false)

  const handleClose = () => {
    setLink('')
    setTitle('')
    setEmoji('')
    setAddEmoji(false)
    setModalOpen(false)
  }

  useEffect(() => {
    setLink(selectedLink?.link)
    setTitle(selectedLink?.title)
    setEmoji(selectedLink?.emoji)
    setColor(selectedLink?.color || 'transparent')
  }, [selectedLink])

  return (
    <>
      <Modal isOpen={modalOpen} onClose={handleClose} isCentered>
        <ModalOverlay />
        <ModalContent mx={{ base: 2, md: 0 }}>
          {!addEmoji ? (
            <EditLinkModal
              user={user}
              setUser={setUser}
              modalOpen={modalOpen}
              setModalOpen={setModalOpen}
              isEdit={isEdit}
              selectedLink={selectedLink}
              link={link}
              setLink={setLink}
              title={title}
              setTitle={setTitle}
              emoji={emoji}
              color={color}
              setAddEmoji={setAddEmoji}
              handleClose={handleClose}
            />
          ) : (
            <AddEmojiModal
              user={user}
              setUser={setUser}
              modalOpen={modalOpen}
              setModalOpen={setModalOpen}
              isEdit={isEdit}
              selectedLink={selectedLink}
              link={link}
              setLink={setLink}
              title={title}
              setTitle={setTitle}
              emoji={emoji}
              setEmoji={setEmoji}
              color={color}
              setAddEmoji={setAddEmoji}
              setColor={setColor}
            />
          )}
        </ModalContent>
      </Modal>
    </>
  )
}
export default LinkModal
