import { useState, useCallback, ChangeEvent } from 'react'

import {
  Box,
  Button,
  Center,
  HStack,
  Image,
  Input,
  ModalBody,
  ModalCloseButton,
  ModalHeader,
  SimpleGrid,
  Spinner,
  Text,
  useToast,
  VStack,
} from '@chakra-ui/react'

import { AiOutlineCloudUpload } from 'react-icons/ai'
import { FaArrowLeft } from 'react-icons/fa'
import { debounce } from 'lodash'
import data from '@emoji-mart/data'

import { FaIconKey, TUser } from 'types/user'

import { uploadFile } from 'utils/uploadfile'
import DynamicIcon from 'components/DynamicIcon'

const { SearchIndex, init } = require('emoji-mart') //eslint-disable-line

type AddEmojiModalProps = {
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
  setEmoji: (emoji: string) => void
  color: string
  setColor: (color: string) => void
  setAddEmoji: (addEmoji: boolean) => void
}

const AddEmojiModal = ({ emoji, setEmoji, setAddEmoji, user }: AddEmojiModalProps) => {
  const toast = useToast()
  const [settingSelection, setSettingSelection] = useState('Emoji')
  const selectionOptions = ['Icon', 'Emoji', 'Custom']
  const [imageLoading, setImageLoading] = useState(false)
  const [emojis, setEmojis] = useState([
    '🤘',
    '🦄',
    '👻',
    '🌶',
    '🪁',
    '📞',
    '🚢',
    '👋',
    '🥶',
    '✉️',
    '🙉',
    '📆',
  ])
  // const colorOptions = [
  //   'red.200',
  //   'blue.200',
  //   'green.200',
  //   'yellow.200',
  //   'orange.200',
  //   'purple.200',
  //   'pink.200',
  //   'black',
  // ]

  init({ data })

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debounceSearch = useCallback(
    debounce((name) => {
      search(name)
    }, 500),
    []
  )

  async function search(e: string) {
    const emojis = await SearchIndex.search(e)
    const results = emojis?.map((emoji: any) => {
      return emoji.skins[0].native
    })

    if (!results || results.length === 0) {
      setEmojis(['🤟', '🦄', '👻', '🌶', '🪁', '📞', '🚢', '👋', '🥶', '✉️', '🙉', '📆'])
    } else {
      // if results.length is less then 12, add some random emojis
      if (results.length < 12) {
        const amountToAdd = 12 - results.length
        const randomEmojis = ['🤟', '🦄', '👻', '🌶', '🪁', '📞', '🚢', '👋', '🥶', '✉️', '🙉', '📆']
        for (let i = 0; i < amountToAdd; i++) {
          if (results.find((emoji: any) => emoji === randomEmojis[i])) {
            results.push(randomEmojis[i + 1])
          } else {
            results.push(randomEmojis[i])
          }
        }
      }
      const finalResults = results.slice(0, 12)
      setEmojis(finalResults)
    }
  }

  const uploadImage = async (e: ChangeEvent<HTMLInputElement>) => {
    setImageLoading(true)

    const { imageURL, error } = await uploadFile(e.target.files![0])

    if (!imageURL || error) {
      toast({ title: error, status: 'error' })
      setImageLoading(false)
      return
    }

    setEmoji(imageURL)
    setAddEmoji(false)
    setImageLoading(false)
  }

  const iconOptions = [
    'FaLinkedin',
    'FaInstagram',
    'FaSoundcloud',
    'FaTwitter',
    'FaDiscord',
    'FaGithub',
    'FaGlobe',
    'FaSnapchat',
    'FaYoutube',
    'FaMedium',
    'FaTwitch',
    'FaSpotify',
  ]
  const handleSelectEmoji = (emoji: string) => {
    setEmoji(emoji)
    setAddEmoji(false)
  }

  return (
    <>
      <ModalHeader>
        <Box cursor="pointer" as={FaArrowLeft} onClick={() => setAddEmoji(false)} />
      </ModalHeader>
      <ModalCloseButton _focus={{ boxShadow: 'none' }} />
      <ModalBody>
        <HStack w="full" spacing={0} pb={6}>
          {selectionOptions.map((option) => (
            <Button
              key={option}
              rounded={0}
              border="1px"
              borderRight={option === 'Custom' ? '1px' : '0px'}
              borderWidth={4}
              borderColor="blue.500"
              bg={settingSelection == option ? 'blue.500' : 'white'}
              textColor={settingSelection == option ? 'white' : 'blue.500'}
              onClick={() => setSettingSelection(option)}
              _hover={{ opacity: 0.92, transform: 'scale(1.01)' }}
              w="full"
              _focus={{ boxShadow: 'none' }}
            >
              {option}
            </Button>
          ))}
        </HStack>
        <VStack w="full">
          {settingSelection == 'Icon' && (
            <SimpleGrid columns={4} spacingY={6} w="full" pb={8}>
              {iconOptions.map((iconOption, index) => (
                <Box
                  key={index}
                  border={emoji == iconOption ? '1px' : '0px'}
                  borderColor="black"
                  rounded="lg"
                  p="1"
                  cursor="pointer"
                  py={emoji != iconOption ? '1px' : '0px'}
                  onClick={() => handleSelectEmoji(iconOption)}
                >
                  <Center key={index}>
                    <DynamicIcon icon={iconOption as FaIconKey} size={36} />
                  </Center>
                </Box>
              ))}
            </SimpleGrid>
          )}
          {settingSelection == 'Emoji' && (
            <>
              <Input
                _focus={{ borderColor: 'gray.800' }}
                placeholder="Search"
                onChange={(e) => debounceSearch(e.target.value)}
              />
              <SimpleGrid columns={4} spacingY={4} w="full" pb={8}>
                {emojis.map((emojiOption, index) => (
                  <Box
                    key={index}
                    border={emojiOption == emoji ? '1px' : '0px'}
                    borderColor="blue.500"
                    rounded="lg"
                    cursor="pointer"
                    py={emoji != emojiOption ? '1px' : '0px'}
                    onClick={() => handleSelectEmoji(emojiOption)}
                  >
                    <Center _hover={{ opacity: 0.72 }} p={0} transitionDuration="200ms">
                      <Text fontSize="1.8rem">{emojiOption}</Text>
                    </Center>
                  </Box>
                ))}
              </SimpleGrid>
            </>
          )}
          {settingSelection == 'Custom' && (
            <>
              {emoji?.includes('://') && !imageLoading ? (
                <>
                  <VStack w="full" py={8}>
                    <Image src={emoji} rounded="md" w="30%" h="30%" />
                    <label>
                      <Text cursor="pointer" textDecor="underline">
                        Swap Image
                      </Text>
                      <input type="file" accept="image/*" onChange={(e) => uploadImage(e)} />
                    </label>
                  </VStack>
                </>
              ) : (
                <VStack w="full" py={8}>
                  {!imageLoading ? (
                    <>
                      <label>
                        <Box
                          as={AiOutlineCloudUpload}
                          _hover={{
                            opacity: 0.72,
                          }}
                          cursor="pointer"
                          transitionDuration="200ms"
                          size={36}
                        />
                        <input type="file" accept="image/*" onChange={(e) => uploadImage(e)} />
                      </label>
                      <Text>Upload your own image</Text>
                    </>
                  ) : (
                    <Spinner />
                  )}
                </VStack>
              )}
            </>
          )}
          {/* allowing color background. currently disabled */}
          {/* <HStack pt={6}>
            {colorOptions.map((colorOption) => (
              <Box
                key={colorOption}
                border={color == colorOption ? '1px' : '0px'}
                borderColor="blue.500"
                rounded="lg"
                p="0.5"
                cursor="pointer"
                onClick={() => setColor(colorOption)}
              >
                <Box w={8} h={8} rounded="lg" bg={colorOption} />
              </Box>
            ))}
            <Box
              border={color == 'transparent' ? '1px' : '0px'}
              borderColor="blue.500"
              rounded="lg"
              p="0.5"
              cursor="pointer"
              onClick={() => setColor('transparent')}
            >
              <Box w={8} h={8} rounded="lg">
                <Image src="/assets/editor/transparent.png" />
              </Box>
            </Box>
          </HStack>
          <Text>Select Your Bcknd Color!</Text> */}
        </VStack>
      </ModalBody>
    </>
  )
}
export default AddEmojiModal
