import { useState } from 'react'

import { Heading, VStack } from '@chakra-ui/react'

import { TUser } from 'types/user'
import ICON_OPTIONS from 'consts/icons'

import Icons from './IconOrder'
import AddIconModal from './Modal'

type AddIconsProps = {
  user: TUser
  setUser: (user: TUser) => void
}

const AddIcons = ({ user, setUser }: AddIconsProps) => {
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedIcon, setSelectedIcon] = useState() as any

  return (
    <>
      <Heading pt={4} fontSize="xl" textColor="gray.600">
        Socials
      </Heading>
      <VStack spacing={4} align="left">
        <Icons
          user={user}
          setUser={setUser}
          setSelectedIcon={setSelectedIcon}
          setModalOpen={setModalOpen}
        />

        <AddIconModal
          user={user}
          setUser={setUser}
          selectedIcon={selectedIcon}
          setSelectedIcon={setSelectedIcon}
          modalOpen={modalOpen}
          setModalOpen={setModalOpen}
        />
      </VStack>
    </>
  )
}
export default AddIcons
