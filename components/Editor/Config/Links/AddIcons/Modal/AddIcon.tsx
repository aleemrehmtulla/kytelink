import { useState } from 'react'

import {
  Button,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  VStack,
  HStack,
  Text,
  Spacer,
  Link,
  useToast,
} from '@chakra-ui/react'

import { FaIconKey, TIcon, TUser } from 'types/user'
import DynamicIcon from 'components/DynamicIcon'
import ICON_OPTIONS, { TIconOption } from 'consts/icons'

type AddIconModalProps = {
  user: TUser
  setSelectedIcon: (selectedIcon: TIcon | TIconOption) => void
  closeModal: () => void
}

const AddIcon = ({ user, setSelectedIcon, closeModal }: AddIconModalProps) => {
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const { icons } = user

  const handleDone = () => {
    setLoading(true)
    setTimeout(() => {
      closeModal()
      setLoading(false)
    }, 400)
  }

  return (
    <>
      <ModalHeader>Add Icon</ModalHeader>
      <ModalCloseButton _focus={{ boxShadow: 'none' }} />
      <ModalBody>
        <VStack
          h="16rem"
          overflowY="scroll"
          sx={{ '&::-webkit-scrollbar': { width: '0rem' } }}
          pb={4}
          spacing={4}
        >
          {ICON_OPTIONS.map((option: TIconOption) => {
            // contact (VCFs) are nuked rn - but we keep icon for those who already have it
            if (option.name === 'Contact') return null
            return (
              <VStack key={option.name} w="full">
                <HStack
                  w="full"
                  border="1px"
                  borderColor="gray.200"
                  borderWidth={2}
                  p={2}
                  px={4}
                  borderRadius="md"
                >
                  <HStack>
                    <DynamicIcon icon={option.icon as FaIconKey} />
                    <Text>{option.name}</Text>
                  </HStack>
                  <Spacer />
                  <Link
                    onClick={() => {
                      if (icons.length === 5) {
                        toast({ title: 'Max 5 icons. Remove one first!', status: 'error' })
                      } else {
                        setSelectedIcon(option)
                      }
                    }}
                    _focus={{ outline: 'none' }}
                  >
                    {icons.find((icon: any) => icon.name === option.name) ? (
                      <Text color="gray.500">Edit</Text>
                    ) : (
                      <Text color="blue.500">Add</Text>
                    )}
                  </Link>
                </HStack>
              </VStack>
            )
          })}
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
          isLoading={loading}
          onClick={handleDone}
        >
          Done
        </Button>
      </ModalFooter>
    </>
  )
}
export default AddIcon
