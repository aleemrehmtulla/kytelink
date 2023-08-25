import { Avatar, Box, Button, Center, Heading, SimpleGrid, Text, VStack } from '@chakra-ui/react'
import { USERS } from 'consts/landingpage'
import { useState } from 'react'
import { FiArrowUpRight } from 'react-icons/fi'

const LandingExamples = () => {
  const [selectedUser, setSelectedUser] = useState<{ username: string; pfp: string } | null>(null)

  const handleMouseEnter = (user: { username: string; pfp: string }) => {
    if (window.innerWidth < 768) return
    setSelectedUser(user)
  }
  const handleMouseLeave = () => {
    setSelectedUser(null)
  }

  return (
    <VStack spacing={0}>
      <Heading fontSize={{ base: '3xl', md: '6xl' }}>Join thousands of others</Heading>

      <SimpleGrid spacing={{ base: 1, md: 4 }} columns={{ base: 3, md: 6 }} pb={{ base: 6, md: 9 }}>
        {USERS.map((user) => {
          return (
            <VStack
              key={user.username}
              onMouseEnter={() => handleMouseEnter(user)}
              onMouseLeave={handleMouseLeave}
              cursor="pointer"
              as="a"
              href={`/${user.username}`}
            >
              <Box
                bg="#7F61D3"
                rounded="full"
                px={2}
                py={1}
                opacity={selectedUser?.username === user.username ? 1 : 0}
                transition="opacity 300ms ease-in-out"
              >
                <Text
                  fontSize="xs"
                  fontWeight="bold"
                  color="white"
                  textAlign="center"
                  _hover={{ textDecor: 'underline' }}
                  _active={{ textDecor: 'underline' }}
                  _focus={{ outline: 'none' }}
                >
                  @{user.username}
                </Text>
              </Box>
              <Center position="relative" transitionDuration="300ms">
                <Avatar
                  src={user.pfp}
                  w={{ base: '75px', md: '80px' }}
                  h={{ base: '75px', md: '80px' }}
                  cursor="pointer"
                  rounded="full"
                  filter={selectedUser?.username === user.username ? 'brightness(0.6)' : ''}
                  transition="filter 300ms ease-in-out"
                  key={user.username}
                  position="relative"
                />
                <Box
                  position="absolute"
                  display={selectedUser?.username === user.username ? '' : 'none'}
                  transition="filter 300ms ease-in-out, transform 300ms ease-in-out"
                  opacity={selectedUser?.username === user.username ? 1 : 0}
                >
                  <FiArrowUpRight size={32} color="white" />
                </Box>
              </Center>
            </VStack>
          )
        })}
      </SimpleGrid>

      <Button
        bg="#7F61D3"
        _hover={{ bg: '#6F54BA' }}
        _active={{ bg: '#5B4499' }}
        transitionDuration="300ms"
        rounded="18px"
        fontSize="2xl"
        py={7}
        fontWeight="medium"
        w="full"
        color="white"
        _focus={{ outline: 'none' }}
        as="a"
        href="/signup"
      >
        Build your link now
      </Button>
    </VStack>
  )
}

export default LandingExamples
