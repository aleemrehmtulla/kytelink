import { useState } from 'react'

import { Button, HStack } from '@chakra-ui/react'

import { TUser } from 'types/user'
import LinkModal from '../LinkModal'

import NoLinks from './NoLinks'

type AddLinksProps = {
  user: TUser
  setUser: (user: TUser) => void
}

const AddLinks = ({ user, setUser }: AddLinksProps) => {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <>
      <HStack spacing={4}>
        <Button
          w="full"
          rounded="lg"
          bgGradient="linear(to-l, blue.500, purple.500)"
          _focus={{ boxShadow: 'none' }}
          _hover={{ opacity: 0.8 }}
          _active={{ opacity: 0.6 }}
          transitionDuration="0.5s"
          color="white"
          size="lg"
          onClick={() => setModalOpen(true)}
        >
          Add Link
        </Button>
      </HStack>
      <LinkModal
        user={user}
        setUser={setUser}
        modalOpen={modalOpen}
        setModalOpen={setModalOpen}
        isEdit={false}
      />
      {/* if theres no links, display NoLinks */}
      {!user.links || (user.links.length === 0 && <NoLinks />)}
    </>
  )
}
export default AddLinks
