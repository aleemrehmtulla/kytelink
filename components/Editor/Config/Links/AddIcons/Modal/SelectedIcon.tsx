// headsup -- nuked VCFs from here
// rmed in july 7th 2023 commit
import { useEffect, useState } from 'react'

import {
  Button,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  VStack,
  Input,
  InputGroup,
  Text,
  Link,
  Box,
  InputLeftAddon,
  useToast,
} from '@chakra-ui/react'
import { FaArrowLeft } from 'react-icons/fa'

import { TUser } from 'types/user'

type AddIconModalProps = {
  user: TUser
  setUser: (user: TUser) => void
  selectedIcon: any
  setSelectedIcon: (selectedIcon: any) => void
  closeModal: () => void
}

const SelectedIcon = ({
  user,
  setUser,
  selectedIcon,
  setSelectedIcon,
  closeModal,
}: AddIconModalProps) => {
  const toast = useToast()
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)

  const exists = user.icons.find((icon) => icon.name === selectedIcon.name)

  const saveIcon = () => {
    setLoading(true)
    const fullURL = selectedIcon.prefill + username
    setTimeout(() => {
      if (!username) {
        toast({ title: 'Please enter a username', status: 'error', duration: 3000 })
        setLoading(false)
        return
      }
      const existingIcon = user.icons.find((icon) => icon.name === selectedIcon.name)
      if (existingIcon) {
        const newIcons = user.icons.map((icon) => {
          if (icon.name === selectedIcon.name) {
            return { name: selectedIcon.name, url: fullURL }
          }
          return icon
        })

        setUser({ ...user, icons: newIcons })
      } else {
        setUser({ ...user, icons: [...user.icons, { name: selectedIcon.name, url: fullURL }] })
      }
      setSelectedIcon('')
      setLoading(false)
      closeModal()
    }, 400)
  }
  const deleteIcon = () => {
    setLoading(true)

    const newIcons = user.icons.filter((icon) => icon.name !== selectedIcon.name)

    setTimeout(() => {
      setUser({ ...user, icons: newIcons })
      setSelectedIcon('')
      closeModal()
    }, 300)
  }

  useEffect(() => {
    if (exists && exists.url) {
      setUsername(exists.url.replace(selectedIcon.prefill, ''))
    }
  }, [])

  return (
    <>
      <ModalHeader>
        <Box cursor="pointer" as={FaArrowLeft} onClick={() => setSelectedIcon('')} />
      </ModalHeader>

      <ModalCloseButton _focus={{ boxShadow: 'none' }} />
      <ModalBody>
        <VStack pb={6} align="left">
          <Text>{selectedIcon.name}</Text>
          <InputGroup>
            <InputLeftAddon children={selectedIcon.prefill} />
            <Input
              _focus={{
                outline: 'none',
              }}
              p={0}
              pl={2}
              placeholder={selectedIcon.username}
              onChange={(e) => setUsername(e.target.value)}
              value={username}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  saveIcon()
                }
              }}
            />
          </InputGroup>
          {exists && (
            <Link onClick={deleteIcon} fontSize="sm" color="red.500">
              Delete Icon
            </Link>
          )}
        </VStack>
      </ModalBody>
      <ModalFooter p={0}>
        <Button
          bgGradient="linear(to-l, blue.500, purple.500)"
          transitionDuration="500ms"
          _focus={{ outline: 'none' }}
          _active={{ opacity: 0.8 }}
          py={3}
          _hover={{ opacity: 0.9 }}
          color="white"
          rounded={0}
          w="full"
          onClick={saveIcon}
          isLoading={loading}
        >
          Save
        </Button>
      </ModalFooter>
    </>
  )
}
export default SelectedIcon
