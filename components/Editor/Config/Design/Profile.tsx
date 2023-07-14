import { useState, ChangeEvent } from 'react'

import {
  HStack,
  Box,
  Heading,
  VStack,
  Input,
  Avatar,
  Spinner,
  Center,
  Text,
  useToast,
} from '@chakra-ui/react'

import { TUser } from 'types/user'
import { uploadFile } from 'utils/uploadfile'

const Profile = ({ user, setUser }: { user: TUser; setUser: (user: TUser) => void }) => {
  const toast = useToast()
  const [loading, setLoading] = useState<Boolean>(false)

  const uploadImage = async (e: ChangeEvent<HTMLInputElement>) => {
    setLoading(true)

    const { imageURL, blurpfp, error } = await uploadFile(e.target.files![0], true)

    if (imageURL && !error) {
      setUser({ ...user, pfp: imageURL, blurpfp: blurpfp || '' })
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
          <HStack spacing={4}>
            <VStack w="full">
              <Input onChange={(e) => updateName(e)} placeholder="Name" value={user.name} />
              <Input onChange={(e) => updateBio(e)} placeholder="Bio" value={user.description} />
            </VStack>

            <label>
              <input type="file" accept="image/*" onChange={(e) => uploadImage(e)} />
              {loading ? (
                <>
                  <VStack>
                    <Center bg="gray.300" boxSize={20} borderRadius="full">
                      <Spinner />
                    </Center>
                    <Text color="gray.500" w="24" fontSize="xs" textAlign="center">
                      Uploading...
                    </Text>
                  </VStack>
                </>
              ) : (
                <VStack>
                  <Avatar boxSize={20} cursor="pointer" src={user.pfp} />
                  <Text cursor="pointer" color="gray.500" w="24" fontSize="xs" textAlign="center">
                    Click to change
                  </Text>
                </VStack>
              )}
            </label>
          </HStack>
        </Box>
      </Box>
    </>
  )
}
export default Profile
