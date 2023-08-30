import { useState } from 'react'

import { Flex } from '@chakra-ui/react'
import GetStartedModal from 'components/Modals/GetStartedModal'

import Config from './Config'
import Preview from './Preview'
import { TUser } from 'types/user'

type EditorProps = { user: TUser; setUser: (user: TUser) => void; kyteProd: TUser; route: string }

const Editor = ({ user, setUser, route, kyteProd }: EditorProps) => {
  const [modalOpen, setModalOpen] = useState(kyteProd.username ? false : true)

  return (
    <Flex w="full" px={{ base: 4, md: 2 }} minH="100vh" mt="72px">
      <Preview user={user} />

      <Config user={user} setUser={setUser} route={route} />

      <GetStartedModal
        modalOpen={modalOpen}
        setModalOpen={setModalOpen}
        user={user}
        setUser={setUser}
      />
    </Flex>
  )
}
export default Editor
