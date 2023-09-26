import { VStack } from '@chakra-ui/react'

import { TUser } from 'types/user'

import AddDomain from './AddDomain'
import Metadata from './Metadata'
import Redirect from './Redirect'

const Settings = ({ user, setUser }: { user: TUser; setUser: (user: TUser) => void }) => {
  return (
    <VStack align="left" spacing={4}>
      <AddDomain user={user} setUser={setUser} />
      <Redirect user={user} setUser={setUser} />
      <Metadata user={user} setUser={setUser} />
    </VStack>
  )
}
export default Settings
