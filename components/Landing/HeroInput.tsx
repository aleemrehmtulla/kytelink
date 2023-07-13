import { Button, Center, HStack, Input, Stack, Text } from '@chakra-ui/react'

type HeroInputProps = {
  setLink: (link: string) => void
  signup: () => void
}

const HeroInput = ({ setLink, signup }: HeroInputProps) => {
  return (
    <Stack
      spacing={{ base: 2, md: 0 }}
      w="75%"
      direction={{ base: 'column', md: 'row' }}
      justifyContent="center"
    >
      <HStack
        spacing={0}
        py={{ base: 2, md: 0 }}
        border="1px"
        borderColor="black"
        rounded="md"
        roundedRight={{ base: 'md', md: 'none' }}
        borderRight={{ base: '1px', md: 'none' }}
      >
        <Text fontSize={{ base: 'xs', md: 'lg' }} pl={2}>
          kytelink.com/
        </Text>
        <Input
          fontSize={{ base: 'xs', md: 'lg' }}
          border="none"
          w={{ base: 32, md: 60 }}
          p={0}
          pl="0.5"
          _focus={{ outline: 'none' }}
          h="fit"
          placeholder="username"
          onChange={(e) => setLink(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              signup()
            }
          }}
        />
      </HStack>
      <Button
        color="white"
        _hover={{ opacity: 0.8 }}
        _active={{ opacity: 0.6 }}
        _focus={{ outline: 'none' }}
        bg="black"
        roundedLeft={{ base: 'md', md: 'none' }}
        fontSize={{ base: 'md', md: 'lg' }}
        onClick={signup}
      >
        Start Now
      </Button>
    </Stack>
  )
}

export default HeroInput
