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
    <VStack spacing={{ base: 4, lg: 2 }}>
      <Heading fontSize={{ base: '3xl', md: '4xl', lg: '6xl' }} textAlign="center">
        Join successful professionals.
      </Heading>

      <SimpleGrid spacing={4} columns={{ base: 4, lg: 8 }} pb={{ base: 4, md: 8, lg: 10 }}>
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
                px={{ base: 0, lg: 2 }}
                py={{ base: 0, lg: 1 }}
                opacity={selectedUser?.username === user.username ? 1 : 0}
                display={{ base: 'none', lg: 'block' }}
                transition="opacity 300ms ease-in-out"
              >
                <Text
                  fontSize="xs"
                  fontWeight="bold"
                  color="white"
                  textAlign="center"
                  _hover={{ textDecor: 'underline' }}
                  _active={{ textDecor: 'underline' }}
                >
                  @{user.username}
                </Text>
              </Box>
              <Center position="relative" transitionDuration="300ms">
                <Avatar
                  src={user.pfp}
                  w={{ base: '65px', md: '75px', lg: '80px' }}
                  h={{ base: '65px', md: '75px', lg: '80px' }}
                  cursor="pointer"
                  rounded="full"
                  filter={selectedUser?.username === user.username ? 'brightness(0.6)' : ''}
                  _hover={{ filter: 'brightness(0.6)' }}
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
        fontSize={{ base: 'xl', lg: '2xl' }}
        py={{ base: 6, lg: 7 }}
        px={{ base: 8, lg: 24 }}
        fontWeight="medium"
        w={{ base: 'full', lg: '75%' }}
        color="white"
        as="a"
        href="/signup"
      >
        Start Growing Your Business
      </Button>
    </VStack>
  )
}

export default LandingExamples
