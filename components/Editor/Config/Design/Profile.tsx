import { useState, ChangeEvent } from 'react'

import {
  Box,
  Heading,
  VStack,
  Input,
  Avatar,
  Spinner,
  Center,
  Text,
  useToast,
  Stack,
} from '@chakra-ui/react'

import { TUser } from 'types/user'
import { uploadFile } from 'lib/uploadfile'
import { trackClientEvent } from 'lib/posthog'
import { PosthogEvents } from 'consts/posthog'

const Profile = ({ user, setUser }: { user: TUser; setUser: (user: TUser) => void }) => {
  const toast = useToast()
  const [loading, setLoading] = useState<Boolean>(false)

  const uploadImage = async (e: ChangeEvent<HTMLInputElement>) => {
    setLoading(true)

    const { imageURL, blurpfp, error } = await uploadFile(e.target.files![0], true)

    if (imageURL && !error) {
      setUser({ ...user, pfp: imageURL, blurpfp: blurpfp || '' })
      trackClientEvent({ event: PosthogEvents.UPDATED_AVATAR, user })
    } else {
      toast({ title: 'Error', description: error, status: 'error' })
    }

    setLoading(false)
  }

  const updateName = (e: ChangeEvent<HTMLInputElement>) => {
    setUser({ ...user, name: e.target.value })
  }

  const updateBio = (e: ChangeEvent<HTMLInputElement>) => {
    setUser({ ...user, description: e.target.value })
  }

  return (
    <>
      <Box>
        <Box border="1px" borderWidth={2} borderColor="gray.100" dropShadow="md" rounded="lg" p={4}>
          <Heading fontSize="2xl" pb={4}>
            Profile
          </Heading>
          <Stack spacing={2} align="left" direction={{ base: 'column', md: 'row' }}>
            <label>
              <input type="file" accept="image/*" onChange={(e) => uploadImage(e)} />
              {loading ? (
                <>
                  <VStack align="left">
                    <Center bg="gray.300" boxSize={20} borderRadius="full">
                      <Spinner />
                    </Center>
                    <Text color="gray.500" w="24" fontSize="xs" textAlign="center">
                      Uploading...
                    </Text>
                  </VStack>
                </>
              ) : (
                <VStack cursor="pointer" align={{ base: 'left', md: 'center' }}>
                  <Avatar boxSize={{ base: '20', md: '4.5rem' }} src={user.pfp} />
                  <Text
                    color="gray.700"
                    fontSize="xs"
                    textAlign={{ base: 'left', md: 'center' }}
                    w="24"
                  >
                    Click to change
                  </Text>
                </VStack>
              )}
            </label>

            <VStack align="left" w="full">
              <VStack spacing={1} align="left">
                <Text display={{ base: 'block', md: 'none' }} fontWeight="semibold">
                  Name
                </Text>
                <Input
                  _focus={{
                    bg: 'gray.100',
                    borderColor: 'gray.500',
                  }}
                  onChange={(e) => updateName(e)}
                  placeholder="Name"
                  value={user.name}
                />
              </VStack>
              <VStack spacing={1} align="left">
                <Text display={{ base: 'block', md: 'none' }} fontWeight="semibold">
                  Description
                </Text>
                <Input
                  _focus={{
                    bg: 'gray.100',
                    borderColor: 'gray.500',
                  }}
                  onChange={(e) => updateBio(e)}
                  placeholder="Description"
                  value={user.description}
                />
              </VStack>
            </VStack>
          </Stack>
        </Box>
      </Box>
    </>
  )
}
export default Profile
