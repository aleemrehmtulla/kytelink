import { Box, HStack, Text, useBreakpointValue, VStack } from '@chakra-ui/react'
import { USERS } from 'consts/landingpage'
import Image from 'next/image'

const HorizontalScroll = () => {
  const size = useBreakpointValue({ base: 32, sm: 40 })

  const leftUsers = USERS.slice(0, Math.floor(USERS.length / 2))
  const rightUsers = USERS.slice(Math.floor(USERS.length / 2), USERS.length)

  return (
    <VStack justifyContent="center" alignItems="center" h="fit">
      <div className="container">
        {leftUsers.map((user, index) => {
          return (
            <HStack rounded="md" bg="purple.600" key={index} spacing={2} p={4} pl={2}>
              <Image
                alt="Horizontal Scroll PFP"
                src={user?.pfp}
                width={size}
                height={size}
                style={{ borderRadius: '50%', objectFit: 'cover', aspectRatio: '1/1' }}
                quality={50}
              />
              <Text fontSize={{ base: 'sm', md: 'md' }} color="white">
                @{user.username}
              </Text>
            </HStack>
          )
        })}
      </div>
      <div className="container2">
        {rightUsers.map((user, index) => {
          return (
            <HStack rounded="md" bg="purple.600" key={index} spacing={2} p={4} pl={2}>
              <Image
                alt="Horizontal Scroll PFP"
                src={user?.pfp}
                width={size}
                height={size}
                style={{ borderRadius: '50%', objectFit: 'cover', aspectRatio: '1/1' }}
                quality={50}
              />
              <Text fontSize={{ base: 'sm', md: 'md' }} color="white">
                @{user.username}
              </Text>
            </HStack>
          )
        })}
      </div>
    </VStack>
  )
}

export default HorizontalScroll
