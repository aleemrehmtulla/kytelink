import { Button, Heading, Text, VStack, SimpleGrid, Box, Icon } from '@chakra-ui/react'
import { FaChartLine, FaCrown, FaRocket } from 'react-icons/fa'

const LandingBusinessFeatures = () => {
  const features = [
    {
      icon: FaChartLine,
      title: 'Advanced Analytics',
      description: 'Track every click, understand your audience, and optimize your conversion rates with detailed insights.'
    },
    {
      icon: FaCrown,
      title: 'Professional Branding',
      description: 'Custom domains, premium themes, and advanced customization to match your brand perfectly.'
    },
    {
      icon: FaRocket,
      title: 'Business Growth',
      description: 'Convert visitors into customers with lead capture forms, contact buttons, and call-to-action optimization.'
    }
  ]

  return (
    <VStack spacing={8}>
      <Heading fontSize={{ base: '3xl', md: '4xl', lg: '6xl' }}>Built for Business Success</Heading>
      <Text
        fontSize={{ base: 'md', md: 'lg', lg: 'xl' }}
        textAlign="center"
        color="gray.600"
        w={{ base: '100%', md: '70%' }}
        px={{ base: 4, md: 0 }}
        pb={4}
      >
        Everything you need to turn your bio link into a powerful business growth tool
      </Text>
      
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={8} w="100%" maxW="6xl">
        {features.map((feature, index) => (
          <Box key={index} textAlign="center" p={6}>
            <Icon as={feature.icon} w={12} h={12} color="#7F61D3" mb={4} />
            <Heading size="lg" mb={3}>{feature.title}</Heading>
            <Text color="gray.600" fontSize="md">{feature.description}</Text>
          </Box>
        ))}
      </SimpleGrid>

      <Button
        bg="#7F61D3"
        color="white"
        rounded="18px"
        size={'lg'}
        py={{ base: 6, lg: 7 }}
        fontSize={{ base: 'xl', lg: '2xl' }}
        _hover={{ bg: '#6F54BA' }}
        _active={{ bg: '#5B4499' }}
        as="a"
        href="/signup"
      >
        Start Your Free Trial
      </Button>
    </VStack>
  )
}

export default LandingBusinessFeatures
