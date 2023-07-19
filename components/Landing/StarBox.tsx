import { Box, HStack, Text } from '@chakra-ui/react'
import { FaGithub } from 'react-icons/fa'

const StarBox = () => {
  return (
    <Box
      position="relative"
      h="32px"
      display={{ base: 'flex', md: 'inline-flex' }}
      alignItems="center"
      justifyContent="center"
      fontSize="14px"
      width="fit-content"
      cursor="pointer"
      _hover={{ opacity: 0.8, transform: 'scale(1.05)' }}
      transitionDuration="400ms"
      px="0.5"
      _before={{
        content: '""',
        display: 'block',
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        background: 'linear-gradient(90deg, #6B46C1 0%, #EC4899 50%, #1E2F97 100%)',
        borderRadius: '9999px',
        zIndex: -1,
        transition: 'transform .2s ease-in-out',
        transformOrigin: '0 100%',
      }}
    >
      <a href="https://github.com/aleemrehmtulla/kytelink" target="_blank" rel="noreferrer">
        <HStack
          bg="white"
          color="black"
          fontWeight="semibold"
          rounded="full"
          p={1}
          pr={3}
          pl={{ base: 2, md: 1 }}
        >
          <Text display={{ base: 'block', md: 'none' }}>Star us on GitHub!</Text>
          <Text display={{ base: 'none', md: 'block' }}>Check out the source code on GitHub</Text>
          <FaGithub />
        </HStack>
      </a>
    </Box>
  )
}
export default StarBox
