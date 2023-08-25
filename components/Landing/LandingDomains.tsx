import { VStack, Heading, SimpleGrid, Center, Text, HStack, Button } from '@chakra-ui/react'

const DOMAINS = [
  { text: 'kyte.lol/harsh', color: 'D2F2F4' },
  { text: 'kyte.bio/arib', color: 'DAD2F1' },
  { text: 'kytelink.com/josh', color: 'D8FED2' },
  { text: 'downsad.com/aleem', color: 'FED2D2' },
]

const LandingDomains = () => {
  return (
    <VStack spacing={8}>
      <VStack spacing={0}>
        <Heading fontSize={{ base: '2xl', md: '6xl' }}>Select one of our 4 domains.</Heading>
        <Heading fontSize={{ base: '2xl', md: '6xl' }}>Or bring your own. For free.</Heading>
      </VStack>
      <SimpleGrid columns={{ base: 2, md: 2 }} spacing={4} w="full">
        {DOMAINS.map((domain) => (
          <Center
            bg={`#${domain.color}`}
            rounded="xl"
            alignContent="center"
            key={domain.text}
            py={3}
            px={{ base: 2, md: 12 }}
          >
            <Text color="gray.700" fontWeight="medium" fontSize={{ base: 'md', md: '2xl' }}>
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
          py={{ base: 16, md: 24 }}
          w="full"
          spacing={0}
          borderWidth={4}
        >
          <Text fontSize={{ base: '2xl', md: '5xl' }} fontWeight="bold">
            400ms
          </Text>
          <Text fontSize={{ base: 'sm', md: 'lg' }}>Kyte Loads Fast.</Text>
        </VStack>
        <VStack
          bg="#FDF6F3"
          border={1}
          borderColor="#EEEEEE"
          rounded="xl"
          p={4}
          w="full"
          py={{ base: 16, md: 24 }}
          spacing={0}
          borderWidth={4}
        >
          <Text fontSize={{ base: '2xl', md: '5xl' }} fontWeight="bold">
            9 Themes
          </Text>
          <Text fontSize={{ base: 'sm', md: 'lg' }}>Kyte Looks Good.</Text>
        </VStack>
      </HStack>
      <Button
        bg="#7F61D3"
        rounded="18px"
        fontSize="lg"
        fontWeight="medium"
        color="white"
        px={16}
        py={7}
        w="full"
        _hover={{ opacity: 0.8 }}
        _active={{ opacity: 0.6 }}
        _focus={{ outline: 'none' }}
      >
        Try it out for yourself
      </Button>
    </VStack>
  )
}

export default LandingDomains
