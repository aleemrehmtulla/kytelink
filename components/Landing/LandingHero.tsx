import { Button, Heading, Link, Text, VStack } from '@chakra-ui/react'
const LandingHero = () => {
  return (
    <VStack spacing={4} align="center">
      <VStack spacing={0} align="center">
        <Heading fontSize={{ base: '3xl', md: '7xl' }}>A Simple Link-In-Bio.</Heading>
        <Heading fontSize={{ base: '3xl', md: '7xl' }}>But Free and Opensource.</Heading>
      </VStack>

      <Text color="gray.600" fontSize={{ base: 'lg', md: '2xl' }} textAlign="center" pb={2}>
        Custom Domains. 9+ Themes. Detailed Analytics. Blazing Fast.
      </Text>

      <Button
        bg="#7F61D3"
        _hover={{ bg: '#6F54BA' }}
        _active={{ bg: '#5B4499' }}
        rounded="18px"
        fontSize="xl"
        fontWeight="medium"
        color="white"
        px={{ base: 8, md: 16 }}
        py={7}
        _focus={{ outline: 'none' }}
        as="a"
        href="/login"
      >
        Create your Kytelink
      </Button>
      <Link color="gray.500" fontSize="lg" textAlign="center" cursor={'pointer'} href="/login">
        Login
      </Link>
    </VStack>
  )
}

export default LandingHero
