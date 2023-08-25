import { VStack, Text, Image } from '@chakra-ui/react'

const LandingFooter = () => {
  return (
    <VStack spacing={{ base: 6, md: 8 }} pb={16}>
      <Image src="/logo.png" h={{ base: 10, md: 12 }}></Image>
      <Text textColor="#898989" fontSize={{ base: 'sm', md: 'lg' }}>
        Designed with love. Built with coffee.
      </Text>
    </VStack>
  )
}

export default LandingFooter
