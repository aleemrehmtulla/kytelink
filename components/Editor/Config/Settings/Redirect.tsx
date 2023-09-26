import { useEffect } from 'react'

import { Heading, VStack, Text, Input, Switch, HStack } from '@chakra-ui/react'

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
        <HStack spacing={2}>
          <Text>Redirect is currently {user?.shouldRedirect ? 'on' : 'off'}</Text>
          <Switch
            isChecked={user?.shouldRedirect}
            onChange={() => setUser({ ...user, shouldRedirect: !user?.shouldRedirect })}
          />
        </HStack>
      </VStack>
    </VStack>
  )
}
export default Redirect
