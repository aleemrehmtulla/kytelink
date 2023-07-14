import { Box, Heading, Stack, Text, VStack } from '@chakra-ui/react'
import { DASHBOARD_BLUR } from 'consts/base64'
import Image from 'next/image'

const SimpleDashboard = () => {
  const imageSrc = '/assets/landing/product.png'

  return (
    <Stack
      align="center"
      spacing={{ base: 0, md: 12, lg: 24 }}
      py={{ base: 0, md: 16 }}
      direction={{ base: 'column', lg: 'row' }}
    >
      <VStack display={{ base: 'none', md: 'block' }}>
        <Text w="full" fontSize="4xl">
          A straight forward dashboard
        </Text>
        <Heading fontWeight="black" bg="purple.200" fontSize="6xl">
          Make your link.
          <br />
          Make it fast.
        </Heading>
        <Text w="full" fontSize="3xl">
          edit your link, see your stats, and more.
        </Text>
      </VStack>
      <ImageBox src={imageSrc} />
    </Stack>
  )
}

const ImageBox = ({ ...props }) => (
  <Box
    border="1px"
    borderWidth={5}
    borderColor="gray.800"
    rounded="xl"
    p={1}
    display={props.display}
  >
    <Image
      alt="Kytelink Dashboard"
      width={2592 / 6}
      height={1754 / 6}
      src={props.src}
      placeholder="blur"
      blurDataURL={DASHBOARD_BLUR}
    />
  </Box>
)

export default SimpleDashboard
