import { VStack, Heading, SimpleGrid, Center, Text, HStack, Button } from '@chakra-ui/react'
import { LANDING_DOMAINS } from 'consts/landingpage'

const LandingDomains = () => {
  return (
    <VStack spacing={8}>
      <VStack spacing={0} textAlign="center">
        <Heading fontSize={{ base: '3xl', md: '4xl', lg: '6xl' }}>Use one of 4 domains.</Heading>
        <Heading fontSize={{ base: '3xl', md: '4xl', lg: '6xl' }}>Or bring your own.</Heading>
      </VStack>
      <SimpleGrid columns={2} spacing={4} w="full">
        {LANDING_DOMAINS.map((domain) => (
          <Center
            bg={`#${domain.color}`}
            rounded="xl"
            alignContent="center"
            key={domain.text}
            py={{ base: 2, lg: 3 }}
            px={{ base: 2, lg: 12 }}
          >
            <Text color="gray.700" fontWeight="medium" fontSize={{ base: 'md', lg: '2xl' }}>
              {domain.text}
            </Text>
          </Center>
        ))}
      </SimpleGrid>
      <HStack w="100%" spacing={4}>
        <VStack
          bg="#F0F8FF"
          border={1}
          borderColor="#EEEEEE"
          rounded="xl"
          p={4}
          py={{ base: 16, lg: 24 }}
          w="full"
          spacing={0}
          borderWidth={4}
        >
          <Text fontSize={{ base: '2xl', lg: '5xl' }} fontWeight="bold">
            400ms
          </Text>
          <Text fontSize={{ base: 'sm', lg: 'lg' }}>Kyte Loads Fast.</Text>
        </VStack>
        <VStack
          bg="#FDF6F3"
          border={1}
          borderColor="#EEEEEE"
          rounded="xl"
          p={4}
          w="full"
          py={{ base: 16, lg: 24 }}
          spacing={0}
          borderWidth={4}
        >
          <Text fontSize={{ base: '2xl', lg: '5xl' }} fontWeight="bold">
            9 Themes
          </Text>
          <Text fontSize={{ base: 'sm', lg: 'lg' }}>Kyte Looks Good.</Text>
        </VStack>
      </HStack>
      <Button
        bg="#7F61D3"
        _hover={{ bg: '#6F54BA' }}
        _active={{ bg: '#5B4499' }}
        transitionDuration="300ms"
        rounded="18px"
        py={{ base: 6, lg: 7 }}
        fontSize={{ base: 'xl', lg: '2xl' }}
        fontWeight="medium"
        w="full"
        color="white"
        _focus={{ outline: 'none' }}
        as="a"
        href="/signup"
      >
        Try it out for free
      </Button>
    </VStack>
  )
}

export default LandingDomains
