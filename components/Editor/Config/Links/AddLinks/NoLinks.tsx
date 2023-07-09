import { Heading, Text, VStack } from '@chakra-ui/react'

const NoLinks = () => {
  return (
    <VStack
      align="left"
      border="1px"
      borderStyle="dashed"
      borderColor="gray.300"
      rounded="lg"
      p={4}
      mt={4}
    >
      <Heading size="md" mb={2}>
        You have no links! Start by adding one.
      </Heading>
      <VStack align="left" spacing={2} fontSize="sm" color="gray.500">
        <Text>1. Click the button above to add a link.</Text>
        <Text>2. Hit below to start adding socials.</Text>
        <Text>3. Head to settings to change your username.</Text>
      </VStack>
    </VStack>
  )
}
export default NoLinks
