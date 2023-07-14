import { Box, Heading, HStack, VStack } from '@chakra-ui/react'
import { EXAMPLE_BLUR } from 'consts/base64'
import Image from 'next/image'

const ExamplePages = ({ isMobile }: { isMobile: boolean | undefined }) => {
  const images = ['amy', 'cce', 'rochan']
  return (
    <>
      <VStack spacing={2} display={{ base: 'block', md: 'none' }}>
        <Heading>It can load in {`<`}1 second</Heading>
        <Heading fontWeight="black" bg="purple.200">
          Seriously. Try Now 👇{' '}
        </Heading>
      </VStack>

      <HStack pt={4} spacing={{ base: 12, lg: 20 }} justify="center">
        {images.map((image, index) => (
          <Box
            display={{
              base: index === 0 || index == 2 ? 'block' : 'none',
              md: 'block',
            }}
            _hover={
              !isMobile
                ? { transform: 'scale(1.01) ', opacity: 0.8 }
                : {
                    opacity: 0.8,
                  }
            }
            transitionDuration="0.2s"
            key={index}
            border="1px"
            cursor="pointer"
            borderWidth={6}
            p={1}
            w={{ base: 32, md: 48, lg: 60 }}
            minH={{ base: 64, lg: '30rem' }}
            rounded="xl"
            onClick={() => {
              window.open(`https://kytelink.com/${image}`)
            }}
          >
            <Image
              alt="index"
              src={`/assets/landing/users/${image}.png`}
              width={isMobile ? 319 : 638}
              height={isMobile ? 676 : 1352}
              blurDataURL={EXAMPLE_BLUR}
              placeholder="blur"
            />
          </Box>
        ))}
      </HStack>
    </>
  )
}

export default ExamplePages
