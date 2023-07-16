import { Heading, HStack, Stack, Text, VStack, useBreakpointValue } from '@chakra-ui/react'
import { USERS } from 'consts/landingpage'
import Image from 'next/image'

const HorizontalScroll = ({ isMobile }: { isMobile: boolean | undefined }) => {
  const imageSize = useBreakpointValue({ base: 32, md: 40 })

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
    <VStack pt={{ base: 4, md: 8 }} pb={0} justifyContent="center" alignItems="center">
      <Stack direction={{ base: 'column', md: 'row' }} spacing={2} pb={12}>
        <Heading fontSize={{ base: '4xl', lg: '5xl' }} color="black" fontWeight="semibold">
          {isMobile && 'Kytelink has served'}
          {!isMobile && `We've served`}
        </Heading>
        <Heading bg="purple.200" fontSize={{ base: '4xl', lg: '5xl' }} fontWeight="black">
          &nbsp; 1,000,000+ &nbsp;
        </Heading>
        <Heading fontSize={{ base: '4xl', lg: '5xl' }} color="black" fontWeight="semibold">
          unique visitors
        </Heading>
      </Stack>
      <div className="container">
        {leftUsers.map((user, index) => {
          return (
            <HStack rounded="md" bg="purple.200" key={index} spacing={4} w="fit" h="1" p={3}>
              <Image
                alt="Horizontal Scroll PFP"
                src={user?.pfp}
                style={{ borderRadius: '50%', objectFit: 'cover' }}
                width={imageSize}
                height={imageSize}
              />
              <Text fontSize="sm" color="black">
                @{user.username}
              </Text>
            </HStack>
          )
        })}
      </div>
      <div className="container2">
        {rightUsers.map((user, index) => {
          return (
            <HStack rounded="md" bg="purple.200" key={index} spacing={4} w="fit" p={4}>
              <Image
                alt="Horizontal Scroll PFP"
                src={user?.pfp}
                style={{ borderRadius: '50%', objectFit: 'cover' }}
                width={imageSize}
                height={imageSize}
              />
              <Text fontSize="sm" color="black">
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
