import { Box, Center, Link, Text, VStack } from '@chakra-ui/react'

const NoUserScreen = () => {
  return (
    <Center h="100vh">
      <VStack spacing={4}>
        <Box>
          <Text fontSize="6xl">🪁</Text>
        </Box>
        <Text pt={4} fontSize="xs">
          No user found. Try logging in again{' '}
          <Link
            href="/login"
            color="blue.500"
            _focus={{
              outline: 'none',
            }}
          >
            {' '}
            here.
          </Link>
        </Text>
      </VStack>
    </Center>
  )
}
export default NoUserScreen
