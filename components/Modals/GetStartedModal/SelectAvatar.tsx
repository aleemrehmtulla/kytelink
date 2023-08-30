import { ChangeEvent, useState } from 'react'

import { Avatar, Box, Center, Image, Spinner, Text, useToast, VStack } from '@chakra-ui/react'

import { TUser } from 'types/user'
import { uploadFile } from 'lib/uploadfile'
import { trackClientEvent } from 'lib/posthog'
import { PosthogEvents } from 'consts/posthog'
import { BiCamera } from 'react-icons/bi'

type GetStartedModalProps = {
  user: TUser
  setUser: (user: TUser) => void
}

const SelectAvatar = ({ user, setUser }: GetStartedModalProps) => {
  const toast = useToast()
  const [loading, setLoading] = useState(false)

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

  return (
    <Box h="full">
      <label>
        <input type="file" accept="image/*" onChange={(e) => uploadImage(e)} />
        {loading && (
          <>
            <VStack
              h="full"
              border="1px"
              borderStyle="dashed"
              borderColor="gray.400"
              rounded="md"
              w={28}
              _hover={{ bg: 'gray.100' }}
              cursor="pointer"
              _active={{ bg: 'gray.200' }}
              justify="center"
              transitionDuration="200ms"
            >
              <Spinner size="sm"></Spinner>
              <Text fontSize="xs" textAlign="center" w="full">
                Uploading...
              </Text>
            </VStack>
          </>
        )}
        {!user.pfp && !loading && (
          <VStack
            h="full"
            border="1px"
            borderStyle="dashed"
            borderColor="gray.400"
            rounded="md"
            w={28}
            _hover={{ bg: 'gray.100' }}
            cursor="pointer"
            _active={{ bg: 'gray.200' }}
            justify="center"
            transitionDuration="200ms"
          >
            <BiCamera size={24} />
            <Text fontSize="xs" textAlign="center" w="full">
              Click to upload
            </Text>
          </VStack>
        )}
        {user.pfp && !loading && (
          <VStack
            h="full"
            rounded="md"
            w={28}
            _hover={{ opacity: 0.9 }}
            _active={{ opacity: 0.8 }}
            cursor="pointer"
            justify="center"
            bg="gray.100"
            transitionDuration="200ms"
          >
            <Image src={user.pfp} objectFit="cover" w="100%" h="100%" rounded="md" />
          </VStack>
        )}
      </label>
    </Box>
  )
}

export default SelectAvatar
