import { VStack } from '@chakra-ui/react'

import { TLink, TUser } from 'types/user'
import Link from './Link'

type Props = { user: TUser; isPreview?: boolean }

const Links = ({ user, isPreview }: Props) => {
  return (
    <>
      <VStack
        h="full"
        pb={20}
        w={!isPreview ? { base: 'full', md: '45rem' } : ''}
        px={!isPreview ? 4 : 0}
        spacing={2}
      >
        {user.links &&
          user.links.map((link: TLink) => (
            <Link key={link.link} user={user} link={link} isPreview={isPreview} />
          ))}
      </VStack>
    </>
  )
}
export default Links
