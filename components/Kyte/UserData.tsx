import { VStack, Box, Avatar, Text } from '@chakra-ui/react'

import { TUser } from 'types/user'
import { THEMES } from 'consts/themes'

type UserDataProps = {
  user: TUser
  theme?: string
}

const UserData = ({ user }: UserDataProps) => {
  const style = THEMES[user.theme as keyof typeof THEMES]

  return (
    <VStack spacing={0} mx={user?.name?.length > 20 ? 6 : 0}>
      <Box>
        <Avatar
          size="2xl"
          src={user?.pfp}
          name={user?.name}
          border="none"
          bg={user?.pfp ? 'transparent' : style.userData?.avatar}
        />
      </Box>
      <Text
        color={
          user.customColor && user.customColor !== 'default'
            ? user.customColor
            : style.userData.name
        }
        minH={10}
        w={user?.isPreview ? '17rem' : 'full'}
        pb={1}
        pt={3}
        align="center"
        fontWeight="semibold"
        fontSize={user?.isPreview && user?.name?.length > 20 ? 'md' : { base: 'lg', sm: '2xl' }}
        fontFamily={
          user?.customFont && user?.customFont !== 'default' ? user?.customFont : 'sans-serif'
        }
      >
        {user?.name}
      </Text>
      <Text
        textAlign="center"
        color={
          user.customColor && user.customColor !== 'default'
            ? user.customColor
            : style.userData.description
        }
        fontSize={{ sm: 'md', base: 'sm' }}
        fontFamily={
          user?.customFont && user?.customFont !== 'default' ? user?.customFont : 'sans-serif'
        }
      >
        {user?.description}
      </Text>
    </VStack>
  )
}
export default UserData
