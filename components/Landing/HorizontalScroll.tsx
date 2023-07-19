import { HStack, Text, VStack } from '@chakra-ui/react'
import { USERS } from 'consts/landingpage'
import Image from 'next/image'

const HorizontalScroll = () => {
  const leftUsers = USERS.slice(0, Math.floor(USERS.length / 2)).concat(
    USERS.slice(0, Math.floor(USERS.length / 2)).concat(
      USERS.slice(0, Math.floor(USERS.length / 2))
    )
  )

  const rightUsers = USERS.slice(Math.floor(USERS.length / 2), USERS.length).concat(
    USERS.slice(Math.floor(USERS.length / 2), USERS.length).concat(
      USERS.slice(Math.floor(USERS.length / 2), USERS.length)
    )
  )
  return (
    <VStack justifyContent="center" alignItems="center" h="fit">
      <div className="container">
        {leftUsers.map((user, index) => {
          return (
            <HStack rounded="md" bg="purple.500" key={index} spacing={2} p={4}>
              <Image
                alt="Horizontal Scroll PFP"
                src={user?.pfp}
                style={{ borderRadius: '50%', objectFit: 'cover', aspectRatio: '1/1' }}
                width={32}
                height={32}
              />
              <Text fontSize="sm" color="gray.200">
                {user.username}
              </Text>
            </HStack>
          )
        })}
      </div>
      <div className="container2">
        {rightUsers.map((user, index) => {
          return (
            <HStack rounded="md" bg="purple.500" key={index} spacing={2} p={4}>
              <Image
                alt="Horizontal Scroll PFP"
                src={user?.pfp}
                style={{ borderRadius: '50%', objectFit: 'cover', aspectRatio: '1/1' }}
                width={32}
                height={32}
              />
              <Text fontSize="sm" color="gray.200">
                {user.username}
              </Text>
            </HStack>
          )
        })}
      </div>
    </VStack>
  )
}

export default HorizontalScroll
