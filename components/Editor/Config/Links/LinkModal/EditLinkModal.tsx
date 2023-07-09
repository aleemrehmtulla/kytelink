import {
  Button,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  VStack,
  Input,
  Box,
  HStack,
  Text,
  Link,
  Center,
  useToast,
  Image,
} from '@chakra-ui/react'

import { GrAddCircle } from 'react-icons/gr'
import { FaIconKey, TLink, TUser } from 'types/user'

import DynamicIcon from 'components/DynamicIcon'

type EditLinkModalProps = {
  user: TUser
  setUser: (user: TUser) => void
  modalOpen: boolean
  setModalOpen: (modalOpen: boolean) => void
  isEdit: boolean
  selectedLink?: any
  link: string
  setLink: (link: string) => void
  title: string
  setTitle: (title: string) => void
  emoji: string
  color: string
  setAddEmoji: (addEmoji: boolean) => void
  handleClose: () => void
}

const EditLinkModal = ({
  user,
  setUser,
  setModalOpen,
  isEdit,
  selectedLink,
  link,
  setLink,
  title,
  setTitle,
  emoji,
  setAddEmoji,
  color,
  handleClose,
}: EditLinkModalProps) => {
  const toast = useToast()
  const obj = {
    link,
    title,
    emoji,
    color,
  }

  const isEmoji = emoji?.includes('Fa')

  const handleDelete = () => {
    const newLinks = user.links.filter((link: TLink) => link.link !== selectedLink.link)
    setUser({ ...user, links: newLinks })
    setModalOpen(false)
  }

  const handleSave = () => {
    if (!obj.title) {
      toast({
        title: 'Title is required',
        description: 'Yo! Please add a 🌶 title for this',
        status: 'error',
        duration: 9000,
      })
      return
    }
    if (!obj.link) {
      toast({
        title: 'Link is required',
        description: 'Huh?! Ya need a link for this to work 😝',
        status: 'error',
        duration: 9000,
      })
      return
    }
    if (!obj.link.includes('.')) {
      toast({
        title: 'Link is invalid',
        description: 'Yo! That link is invalid. Please make sure it has a valid domain',
        status: 'error',
        duration: 9000,
      })
      return
    }

    if (isEdit) {
      updateLink()
    } else {
      createLink()
    }
  }

  const updateLink = () => {
    const newLinks = user.links.map((link: any) => {
      if (link.link === selectedLink.link) {
        return obj
      }
      return link
    })
    setUser({ ...user, links: newLinks })
    handleClose()
  }

  const createLink = () => {
    setUser({ ...user, links: [...user.links, obj] })
    handleClose()
  }

  return (
    <>
      <ModalHeader>{isEdit ? 'Edit' : 'Add'} Link</ModalHeader>
      <ModalCloseButton _focus={{ boxShadow: 'none' }} />
      <ModalBody>
        <HStack mb={isEdit ? 0 : 6}>
          <VStack mr={6}>
            <Input
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Link Title"
              value={title}
              type="text"
              pr={12}
              w="full"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSave()
                }
              }}
            />
            <Input
              w="full"
              onChange={(e) => setLink(e.target.value)}
              placeholder="Link URL"
              type="url"
              value={link}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSave()
                }
              }}
            />
          </VStack>

          {emoji ? (
            <>
              <Box>
                <VStack
                  rounded="xl"
                  bg="white"
                  cursor="pointer"
                  transitionDuration="350ms"
                  _hover={{
                    opacity: '0.8',
                    transform: 'scale(0.98)',
                  }}
                  _active={{ transform: 'scale(1.02)' }}
                  onClick={() => setAddEmoji(true)}
                >
                  <Center w={20} h={20} bg={color} p={isEmoji ? 4 : 0} rounded="xl">
                    <Text fontSize="3xl">
                      {emoji?.includes('Fa') && <DynamicIcon icon={emoji as FaIconKey} size={36} />}
                      {emoji?.includes('://') && (
                        <Image src={emoji} alt="emoji" rounded="md" my={2} objectFit="cover" />
                      )}
                      {!emoji?.includes('Fa') && !emoji?.includes('://') && (
                        <Text fontSize="3xl">{emoji}</Text>
                      )}
                    </Text>
                  </Center>
                </VStack>
                <Link fontSize="sm">Click To Edit</Link>
              </Box>
            </>
          ) : (
            <>
              <VStack
                rounded="xl"
                p={4}
                bg="white"
                cursor="pointer"
                transitionDuration="350ms"
                _hover={{
                  bg: 'gray.100',
                }}
                border="1px"
                borderStyle="dashed"
                onClick={() => setAddEmoji(true)}
              >
                <Box as={GrAddCircle} size="1.5rem" />
                <Text fontSize="xs">Icon/Emoji/Picture</Text>
              </VStack>
            </>
          )}
        </HStack>
        {isEdit && (
          <Box py={3}>
            <Link onClick={handleDelete} pl={1} textColor="red.500">
              Delete
            </Link>
          </Box>
        )}
      </ModalBody>
      <ModalFooter p={0}>
        <Button
          bgGradient="linear(to-l, blue.500, purple.500)"
          transitionDuration="500ms"
          py={3}
          _hover={{ opacity: 0.8 }}
          color="white"
          rounded={0}
          w="full"
          onClick={handleSave}
        >
          Save
        </Button>
      </ModalFooter>
    </>
  )
}
export default EditLinkModal
