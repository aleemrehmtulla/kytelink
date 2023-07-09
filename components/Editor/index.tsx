import { useState } from 'react'

import { Flex } from '@chakra-ui/react'
import GetStartedModal from 'components/Modals/GetStartedModal'

import Config from './Config'
import Preview from './Preview'
import { TUser } from 'types/user'

type EditorProps = {
  user: TUser
  setUser: (user: TUser) => void
  route: string
}

const Editor = ({ user, setUser, route }: EditorProps) => {
  const [modalOpen, setModalOpen] = useState(user.isNewUser)

  return (
    <Flex w="full" minH="100vh" pt="72px" px={{ base: 4, md: 2 }}>
      <Preview user={user} />

      <Config user={user} setUser={setUser} route={route} />
      <GetStartedModal
        isNewUser={user.isNewUser}
        modalOpen={modalOpen}
        setModalOpen={setModalOpen}
        user={user}
        setUser={setUser}
      />
    </Flex>
  )
}
export default Editor
