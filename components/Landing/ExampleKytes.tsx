import { Box, Center, Flex, HStack } from '@chakra-ui/react'
import { AMY_BLUR, ROCHAN_BLUR } from 'consts/base64'
import { PosthogEvents } from 'consts/posthog'
import { trackClientEvent } from 'lib/posthog'
import Image from 'next/image'
import { MouseEvent } from 'react'

const ExampleKytes = () => {
  const IMAGES = [
    { src: '/assets/landing/users/rochan.png', username: 'rochan', blur: ROCHAN_BLUR },
    { src: '/assets/landing/users/amy.png', username: 'amy', blur: AMY_BLUR },
  ]

  const handleKyteClick = (e: MouseEvent<HTMLElement>, username: string) => {
    e.preventDefault()

    trackClientEvent({ event: PosthogEvents.CLICKED_EXAMPLE_KYTE, properties: { username } })

    window.open('https://kytelink.com/' + username, '_blank')
  }

  return (
    <HStack spacing={6} display={{ base: 'none', md: 'flex' }}>
      {IMAGES.map((image) => (
        <Flex
          key={image.username}
          rounded="xl"
          border="3px solid #E2E8F0"
          p={1}
          h={420}
          w={200}
          _hover={{ transform: 'scale(1.01)', opacity: 0.8 }}
          transitionDuration="100ms"
          cursor="pointer"
          as="a"
          href={'https://kytelink.com/' + image.username}
          onClick={(e) => handleKyteClick(e, image.username)}
        >
          <Image
            height={420}
            width={200}
            src={image.src}
            alt={`${image.username}'s Kytelink`}
            placeholder="blur"
            blurDataURL={image.blur}
            priority={true}
          />
        </Flex>
      ))}
    </HStack>
  )
}
export default ExampleKytes
