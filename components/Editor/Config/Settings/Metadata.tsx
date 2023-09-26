import { Heading, VStack, Text, Input } from '@chakra-ui/react'

import { TUser } from 'types/user'

type MetadataProps = {
  user: TUser
  setUser: (user: TUser) => void
}

const Metadata = ({ user, setUser }: MetadataProps) => {
  return (
    <VStack align="left" border="1px" borderColor="gray.200" rounded="lg" p={4}>
      <Heading fontSize="2xl">SEO Metadata</Heading>
      <VStack align="left" spacing={2}>
        <Text fontWeight="semibold" pb={1}>
          Edit how your Kyte appears in search engines
        </Text>

        <Input
          focusBorderColor="gray.200"
          placeholder={`${user.name || user.username} | Kytelink`}
          value={user.seoTitle}
          onChange={(e) => setUser({ ...user, seoTitle: e.target.value })}
        />
        <Input
          focusBorderColor="gray.200"
          placeholder={`Check out ${user.name}'s kyte to grab their links!`}
          value={user.seoDescription}
          onChange={(e) => setUser({ ...user, seoDescription: e.target.value })}
        />
      </VStack>
    </VStack>
  )
}
export default Metadata
