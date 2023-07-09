import { VStack } from '@chakra-ui/react'

import { TUser } from 'types/user'

import AddIcons from './AddIcons'
import AddLinks from './AddLinks'
import Order from './Order'

type LinksProps = {
  user: TUser
  setUser: (user: TUser) => void
}

const Links = ({ user, setUser }: LinksProps) => {
  return (
    <>
      <VStack align="left" spacing={4}>
        <AddLinks user={user} setUser={setUser} />
        <Order user={user} setUser={setUser} />
        <AddIcons user={user} setUser={setUser} />
      </VStack>
    </>
  )
}
export default Links
