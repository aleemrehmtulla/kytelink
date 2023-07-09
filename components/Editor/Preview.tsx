import { Box, Center, VStack } from '@chakra-ui/react'

import { TUser } from 'types/user'
import { THEMES } from 'consts/themes'
import Icons from '../Kyte/Icons/Icons'
import Links from '../Kyte/Links/Links'
import UserData from '../Kyte/UserData'

const Preview = ({ user }: { user: TUser }) => {
  const style = THEMES[user.theme as keyof typeof THEMES]

  return (
    <>
      <Box display={{ base: 'none', lg: 'flex' }} w="full" position="relative">
        <Center position="fixed" display={{ base: 'none', lg: 'flex' }} w="50%" mt={20}>
          <VStack
            borderWidth={4}
            bg={style.bg || 'white'}
            bgGradient={style.bgGradient ? style.bgGradient : undefined}
            border="8px"
            rounded="2xl"
            borderColor={style.previewBorder}
            h="40rem"
            w={{ base: 'full', md: '17rem', lg: '20rem' }}
            pt={12}
            px={6}
          >
            <VStack spacing={3} h="full">
              <UserData user={{ ...user, isPreview: true }} />
              <Icons user={user} isPreview={true} />
              <Box
                w="17rem"
                overflowY="scroll"
                sx={{ '&::-webkit-scrollbar': { display: 'none' } }}
                pt="0.5"
                pb={2}
                px={4}
              >
                <Links user={user} isPreview={true} />
              </Box>
            </VStack>
          </VStack>
        </Center>
      </Box>
    </>
  )
}
export default Preview
