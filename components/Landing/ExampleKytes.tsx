import { Center, HStack, Image } from '@chakra-ui/react'

const ExampleKytes = () => {
  const IMAGES = [
    { src: 'assets/landing/users/rochan.png', username: 'rochan' },
    { src: 'assets/landing/users/amy.png', username: 'amy' },
  ]
  return (
    <HStack
      pr={12}
      spacing={6}
      display={{ base: 'none', md: 'flex' }}
      _hover={{ opacity: 0.8 }}
      cursor="pointer"
      transitionDuration="300ms"
    >
      {IMAGES.map((image) => (
        <Center
          w={48}
          h="27rem"
          rounded="xl"
          border="3px solid #E2E8F0"
          p={1}
          _hover={{ transform: 'scale(1.01)' }}
          transitionDuration="100ms"
          as="a"
          href={`https://kytelink.com/${image.username}`}
          target="_blank"
          rel="noreferrer"
        >
          <Image src={image.src} alt={`${image.username}'s Kytelink`} rounded="xl" />
        </Center>
      ))}
    </HStack>
  )
}
export default ExampleKytes
