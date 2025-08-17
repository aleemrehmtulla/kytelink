import { Text, VStack } from '@chakra-ui/react'

import { TUser } from 'types/user'
import { THEMES } from 'consts/themes'
import Icons from './Icons/Icons'
import Links from './Links/Links'
import UserData from './UserData'

const User = ({ user }: { user: TUser }) => {
  const style = THEMES[(user.theme as keyof typeof THEMES) || 'default']

  return (
    <>
      <VStack
        bg={style.bg ? style.bg : undefined}
        bgGradient={style.bgGradient ? style.bgGradient : undefined}
        minHeight={typeof window !== 'undefined' ? window.innerHeight : '100vh'}
        pt={{ base: 10, md: 24 }}
        spacing={6}
      >
        <UserData theme={user.theme} user={user} />
        {user.icons.length && <Icons user={user} />}
        <Links user={user} />
      </VStack>
      <a href="https://tradlink.com" target="_blank">
        <Text
          mt="-12"
          cursor="pointer"
          textAlign="center"
          textColor={user.theme === 'dark' ? 'white' : 'black'}
          textDecor="underline"
          fontWeight="semibold"
          color={
            user.customColor && user.customColor !== 'default'
              ? user.customColor
              : style.userData.description
          }
        >
          kyte.
        </Text>
      </a>
    </>
  )
}
export default User
