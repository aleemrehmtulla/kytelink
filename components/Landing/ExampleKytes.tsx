import { Box, Center, HStack } from '@chakra-ui/react'
import { AMY_BLUR, ROCHAN_BLUR } from 'consts/base64'
import Image from 'next/image'

const ExampleKytes = () => {
  const IMAGES = [
    { src: '/assets/landing/users/rochan.png', username: 'rochan', blur: ROCHAN_BLUR },
    { src: '/assets/landing/users/amy.png', username: 'amy', blur: AMY_BLUR },
  ]
  return (
    <HStack
      spacing={6}
      display={{ base: 'none', md: 'flex' }}
      _hover={{ opacity: 0.8 }}
      cursor="pointer"
      transitionDuration="300ms"
    >
      {IMAGES.map((image) => (
        <Center
          key={image.username}
          w={48}
          rounded="xl"
          border="3px solid #E2E8F0"
          p={1}
          _hover={{ transform: 'scale(1.01)' }}
          transitionDuration="100ms"
          as="a"
          href={`https://kytelink.com/${image.username}`}
          target="_blank"
        >
          <Box position="relative" h="25rem" w="full">
            <Image
              src={image.src}
              alt={`${image.username}'s Kytelink`}
              placeholder="blur"
              width={400}
              height={800}
              blurDataURL={image.blur}
            />
          </Box>
        </Center>
      ))}
    </HStack>
  )
}
export default ExampleKytes
