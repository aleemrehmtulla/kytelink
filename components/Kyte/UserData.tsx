import { VStack, Box, Text, Center } from '@chakra-ui/react'

import { TUser } from 'types/user'
import { THEMES } from 'consts/themes'
import Image from 'next/image'

type UserDataProps = {
  user: TUser
  theme?: string
}

const UserData = ({ user }: UserDataProps) => {
  const style = THEMES[user.theme as keyof typeof THEMES]
  return (
    <VStack spacing={0} mx={user?.name?.length > 20 ? 6 : 0}>
      <Box rounded="full" w={132} h={132} overflow="hidden">
        {user.pfp ? (
          <Image
            width={132}
            height={132}
            placeholder="blur"
            blurDataURL={`data:image/png;base64,${user.blurpfp || '9j/4AAQSkZJRg'}`}
            src={user.pfp}
            unoptimized={true} // feel free to optimize, since it's not free, im using blurDataURL
            priority={true}
            objectFit="cover"
            alt="user pfp"
          />
        ) : (
          <Center bg="gray.200" w={132} h={132}>
            <Text color="gray.700" fontSize="6xl" fontWeight="bold" textAlign="center">
              {user?.name?.split(' ')[0][0]}
              {user?.name?.split(' ')[1][0]}
            </Text>
          </Center>
        )}
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
