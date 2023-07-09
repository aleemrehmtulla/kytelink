import { VStack } from '@chakra-ui/react'

import { TUser } from 'types/user'

import Fonts from './Fonts'
import Profile from './Profile'
import Themes from './Themes'

type DesignProps = {
  user: TUser
  setUser: (userData: TUser) => void
}

const Design = ({ user, setUser }: DesignProps) => {
  return (
    <VStack align="left" spacing={4}>
      <Profile user={user} setUser={setUser} />
      <Fonts user={user} setUser={setUser} />
      <Themes user={user} setUser={setUser} />
    </VStack>
  )
}
export default Design
