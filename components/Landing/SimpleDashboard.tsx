import { Box, Heading, Image, Stack, Text, VStack } from '@chakra-ui/react'

const SimpleDashboard = () => {
  const imageSrc = '/assets/landing/product.png'

  return (
    <Stack
      align="center"
      px={6}
      direction={{ base: 'column', md: 'row' }}
      spacing={{ base: 12, md: 48 }}
      py={{ base: 0, md: 48 }}
    >
      <ImageBox src={imageSrc} display={{ base: 'none', md: 'block' }} />

      <VStack>
        <Text w="full" fontSize={{ base: '2xl', md: '3xl' }}>
          A straight forward dashboard
        </Text>
        <Heading fontWeight="black" bg="purple.200" fontSize={{ base: '4xl', md: '5xl' }}>
          Make your link.
          <br />
          Make it fast.
        </Heading>
        <Text w="full" fontSize={{ base: 'md', md: '2xl' }}>
          edit your link, see your stats, and more.
        </Text>
      </VStack>
      <ImageBox src={imageSrc} display={{ base: 'block', md: 'none' }} />
    </Stack>
  )
}

const ImageBox = ({ ...props }) => (
  <Box
    border="1px"
    borderWidth={6}
    borderColor="gray.800"
    rounded="xl"
    p={1}
    display={props.display}
  >
    <Image alt="Kytelink Dashboard" w={{ base: '19rem', md: '30rem' }} src={props.src} />
  </Box>
)

export default SimpleDashboard
