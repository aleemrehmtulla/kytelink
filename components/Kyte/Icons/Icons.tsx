import { HStack } from '@chakra-ui/react'
import { TIcon, TUser } from 'types/user'

import Icon from './Icon'

const Icons = ({ user, isPreview }: { user: TUser; isPreview?: boolean }) => {
  return (
    <HStack spacing={4}>
      {user.icons &&
        user.icons.map((icon: TIcon, index) => (
          <Icon key={index} icon={icon} theme={user.theme} userId={user.id} isPreview={isPreview} />
        ))}
    </HStack>
  )
}
export default Icons
