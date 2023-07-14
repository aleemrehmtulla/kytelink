import { Heading, VStack } from '@chakra-ui/react'

const HeaderText = () => {
  return (
    <VStack spacing={2}>
      <Heading fontWeight="black" fontSize={{ base: '4xl', md: '6xl' }}>
        Simple. Fast. Free.
      </Heading>
      <Heading fontWeight="black" bg="purple.200" fontSize={{ base: '2xl', md: '6xl' }}>
        the link for all your links
      </Heading>
    </VStack>
  )
}

export default HeaderText
