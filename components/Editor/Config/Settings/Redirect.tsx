import { useEffect } from 'react'

import { Button, Heading, VStack, Text, Input } from '@chakra-ui/react'

import { TUser } from 'types/user'

type RedirectProps = {
  user: TUser
  setUser: (user: TUser) => void
}

const Redirect = ({ user, setUser }: RedirectProps) => {
  useEffect(() => {
    if (user?.redirectLink?.length === 0) {
      setUser({
        ...user,
        shouldRedirect: false,
      })
    }
  }, [user?.redirectLink])

  return (
    <VStack align="left" border="1px" borderColor="gray.200" rounded="lg" p={4}>
      <Heading fontSize="2xl">Redirects</Heading>
      <VStack align="left" spacing={2}>
        <Text fontWeight="semibold" pb={1}>
          Set a link for your Kyte to redirect to
        </Text>

        <Input
          focusBorderColor="gray.200"
          placeholder="https://yourwebsite.com"
          value={user.redirectLink}
          onChange={(e) => setUser({ ...user, redirectLink: e.target.value })}
        />
        <Button
          bg={user?.shouldRedirect ? 'green.500' : 'red.500'}
          _focus={{ boxShadow: 'none' }}
          _hover={{ opacity: 0.8 }}
          _active={{ opacity: 0.8 }}
          transitionDuration="400ms"
          py={2}
          h="fit"
          color="white"
          fontWeight="medium"
          onClick={() => setUser({ ...user, shouldRedirect: !user?.shouldRedirect })}
        >
          Redirect is currently {user?.shouldRedirect ? 'on' : 'off'}
        </Button>
      </VStack>
    </VStack>
  )
}
export default Redirect
