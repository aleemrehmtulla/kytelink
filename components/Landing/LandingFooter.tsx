import { VStack, Text, Image } from '@chakra-ui/react'

const LandingFooter = () => {
  return (
    <VStack spacing={8} pb={16}>
      <Image src="/logo.png" h={12}></Image>
      <Text textColor="#898989">Designed with love. Built with coffee.</Text>
    </VStack>
  )
}

export default LandingFooter
