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
          Edit Search Indexing [best to leave as is]
        </Text>

        <Input
          focusBorderColor="gray.200"
          value={user.seoTitle}
          defaultValue={`${user.name || user.username} | Kytelink`}
          placeholder="My Short Title (recommended 55-60 characters)"
          onChange={(e) => setUser({ ...user, seoTitle: e.target.value })}
        />
        <Input
          focusBorderColor="gray.200"
          value={user.seoDescription}
          defaultValue={`Check out ${user.name}'s kyte to grab their links!`}
          placeholder="My Short Description (recommended 155-160 characters)"
          onChange={(e) => setUser({ ...user, seoDescription: e.target.value })}
        />
      </VStack>
    </VStack>
  )
}
export default Metadata
