import { Button, Center, Heading, HStack, Image, Link, Text, VStack, Box } from '@chakra-ui/react'
import { useRouter } from 'next/router'
import { IoIosArrowBack } from 'react-icons/io'

const Verify = () => {
  const router = useRouter()
  return (
    <Center h="100vh">
      <Box
        pos="absolute"
        top="0"
        left="0"
        px={{ base: 0, md: 8 }}
        py={4}
        cursor="pointer"
        onClick={() => router.back()}
      >
        <HStack
          _hover={{ background: 'gray.100' }}
          rounded="full"
          p={2}
          px={4}
          transitionDuration="300ms"
        >
          <IoIosArrowBack color="#374051" />
          <Text fontSize="md" fontWeight="bold" color="gray.700">
            Back
          </Text>
        </HStack>
      </Box>
      <VStack align="left" spacing={6} w="35rem">
        <Image src="/logo.png" alt="Kytelink Logo" boxSize="3rem" />
        <VStack spacing={1} align="left">
          <Heading fontSize={{ base: '3xl', md: '4xl' }} color="black">
            We sent you an email!
          </Heading>
          <Text fontSize={{ base: 'xs', md: 'xl' }} color="gray.700">
            Check your inbox for an email from <Link color="blue.500">auth@mail.kytelink.com</Link>{' '}
            and click the verification link to login to your account. If you don't see the email,
            please check your spam folder :)
          </Text>
        </VStack>
        <HStack>
          <Button
            bg="black"
            color="white"
            _hover={{ opacity: 0.8 }}
            _active={{ opacity: 0.5 }}
            _focus={{ outline: 'none' }}
          >
            Resend Email
          </Button>
          <Button
            _hover={{ opacity: 0.8 }}
            _active={{ opacity: 0.5 }}
            _focus={{ outline: 'none' }}
            onClick={() => router.push('mailto:support@kytelink.com')}
            variant="outline"
          >
            DM for support
          </Button>
        </HStack>
      </VStack>
    </Center>
  )
}

export default Verify
