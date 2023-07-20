import { Box, Heading, SimpleGrid, Image, Text, VStack } from '@chakra-ui/react'
import { THEME_OPTIONS } from 'consts/themes'

import { TUser } from 'types/user'

type ThemesProps = { user: TUser; setUser: (user: TUser) => void }

const Themes = ({ user, setUser }: ThemesProps) => {
  return (
    <>
      <Box bg="white" rounded="md" p={2}>
        <Heading pb={2}>Themes</Heading>
        <SimpleGrid columns={{ base: 2, md: 3 }} spacing={3} pb={20}>
          {THEME_OPTIONS.map((i) => (
            <VStack key={i.name}>
              <Box
                cursor="pointer"
                _hover={{ transform: 'scale(1.01)' }}
                border={user.theme === i.key ? '2px' : 'none'}
                borderWidth={user.theme === i.key ? '2px' : 'none'}
                rounded="lg"
                borderColor="blue.500"
                p={1}
                onClick={() => {
                  setUser({ ...user, theme: i.key })
                }}
              >
                <Image rounded="lg" src={i.pfp} />
              </Box>
              <Text fontSize={{ base: 'xs', md: 'md' }}>{i.name}</Text>
            </VStack>
          ))}
        </SimpleGrid>
      </Box>
    </>
  )
}
export default Themes
