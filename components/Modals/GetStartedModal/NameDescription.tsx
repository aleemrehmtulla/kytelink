import { HStack, Input, Text, VStack } from '@chakra-ui/react'
import { BiCamera } from 'react-icons/bi'
import { TUser } from 'types/user'
import SelectAvatar from './SelectAvatar'

type NameDescriptionProps = {
  user: TUser
  setUser: (user: TUser) => void
}

const NameDescription = ({ user, setUser }: NameDescriptionProps) => {
  return (
    <>
      <VStack spacing={2} w="full" align="left">
        <HStack>
          <Text fontSize="md" textAlign="left" textColor="gray.700" fontWeight="semibold">
            Name & Avatar
          </Text>
          <Text fontSize="sm" textColor="red.500" fontWeight="normal">
            (required)
          </Text>
        </HStack>

        <HStack h={24}>
          <SelectAvatar user={user} setUser={setUser} />
          <VStack spacing={2} w="full" h="full">
            <Input
              h="full"
              value={user.name}
              onChange={(e) => setUser({ ...user, name: e.target.value })}
              placeholder="Name"
              _focus={{
                bg: 'gray.100',
                borderColor: 'gray.500',
              }}
            />
            <Input
              h="full"
              value={user.description}
              onChange={(e) => setUser({ ...user, description: e.target.value })}
              placeholder="Description"
              _focus={{
                bg: 'gray.100',
                borderColor: 'gray.500',
              }}
            />
          </VStack>
        </HStack>
      </VStack>
    </>
  )
}

export default NameDescription
