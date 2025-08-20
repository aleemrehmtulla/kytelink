import { Button, Heading, Image, Link, Text, VStack } from '@chakra-ui/react'
const LandingHero = () => {
  return (
    <VStack spacing={4} align="center">
      <VStack spacing={0} align="center">
        <Heading fontSize={{ base: '3xl', md: '5xl', lg: '7xl' }}>Professional Link-in-Bio</Heading>
        <Heading fontSize={{ base: '3xl', md: '5xl', lg: '7xl' }}>Built for Business Growth</Heading>
      </VStack>

      <Text
        color="gray.600"
        fontSize={{ base: 'lg', md: 'xl', lg: '2xl' }}
        textAlign="center"
        pb={2}
      >
        Advanced Analytics. Custom Domains. Premium Themes. Lightning Fast Performance.
      </Text>

      <Button
        bg="#7F61D3"
        _hover={{ bg: '#6F54BA' }}
        _active={{ bg: '#5B4499' }}
        rounded="18px"
        fontSize="xl"
        fontWeight="medium"
        color="white"
        px={{ base: 8, md: 12, lg: 16 }}
        py={7}
        as="a"
        href="/signup"
      >
        Start Growing Your Business
      </Button>
      <Link color="gray.500" fontSize="lg" textAlign="center" cursor={'pointer'} href="/login">
        Login to TradLink
      </Link>
    </VStack>
  )
}

export default LandingHero
