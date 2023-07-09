import { Box, Center, keyframes, Link, Text, VStack } from '@chakra-ui/react'
import { motion } from 'framer-motion'

const LoadingScreen = () => {
  const animationKeyframes = keyframes`
    0% {   transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
    `
  const animation = `${animationKeyframes} 0.8s ease-in-out infinite`
  return (
    <Center h="100vh">
      <VStack spacing={4}>
        <Box as={motion.div} animation={animation}>
          <Text fontSize="6xl">🪁</Text>
        </Box>
        <Text pt={4} fontSize="xs">
          If you&apos;re not redirected in a few seconds, click{' '}
          <Link
            href="/edit"
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
export default LoadingScreen
