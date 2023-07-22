import { useEffect, useState } from 'react'

import {
  Box,
  Heading,
  HStack,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalOverlay,
  SimpleGrid,
  Text,
  VStack,
} from '@chakra-ui/react'
import { BiCheckCircle, BiCopy } from 'react-icons/bi'
import { FaEnvelope, FaLinkedin, FaTwitter, FaWhatsapp } from 'react-icons/fa'

type GetStartedModalProps = {
  modalOpen: boolean
  setModalOpen: (modalOpen: boolean) => void
  username?: string
}

const ShareKyteModal = ({ modalOpen, setModalOpen, username }: GetStartedModalProps) => {
  const urls = ['kyte.bio', 'kyte.lol', 'kytelink.com', 'yoyo.so']
  const socials = [
    {
      icon: FaTwitter,
      name: 'twitter',
      link: `https://twitter.com/intent/tweet?text=Check%20out%20all%20my%20links%20over%20on%20${urls[0]}/${username}`,
    },
    {
      icon: FaWhatsapp,
      name: 'whatsapp',
      link: `https://wa.me/?text=Check%20out%20my%20kyte%20over%20on%20${'kyte.lol'}/${username}`,
    },
    {
      icon: FaLinkedin,
      name: 'linkedin',
      link: `https://www.linkedin.com/sharing/share-offsite/?url=${'kyte.bio'}/${username}`,
    },
    {
      icon: FaEnvelope,
      name: 'email',
      link: `mailto:?subject=yo!%20check%20out%20my%20brand%20new%20kyte%20%3A%29&body=Check%20it%20out%20over%20on%20${'kyte.lol'}/${username}`,
    },
  ]

  const [copied, setCopied] = useState(0)

  useEffect(() => {
    setTimeout(() => {
      setCopied(0)
      if (modalOpen) setModalOpen(false)
    }, 2500)
  }, [copied])

  return (
    <Modal
      isOpen={modalOpen}
      size="2xl"
      onClose={() => {
        setModalOpen(false)
      }}
    >
      <ModalOverlay brightness={1} />
      <ModalContent mt={{ base: '30%', md: '15%' }} mx={4}>
        <ModalCloseButton _focus={{ outline: 'none' }} onClick={() => setModalOpen(true)} />
        <ModalBody pb={20} px={{ base: 4, md: 20 }}>
          <VStack pt={12} spacing={8}>
            <Heading fontSize={{ base: 'md', md: 'lg' }}>
              Share your Kyte with the world 🌎❤️
            </Heading>
            <SimpleGrid columns={2} textAlign="center" spacing={4}>
              {urls.map((url, index) => (
                <HStack
                  _hover={{ bg: 'gray.100', transform: 'scale(1.01)' }}
                  _active={{ transform: 'scale(0.99)', bg: 'gray.200' }}
                  transitionDuration="0.2s"
                  w="full"
                  cursor="pointer"
                  border="1px"
                  rounded="lg"
                  p={{ base: 2, md: 4 }}
                  key={index}
                  onClick={() => {
                    navigator.clipboard.writeText(`${urls[index]}/${username}`)
                    setCopied(index + 1)
                  }}
                >
                  {copied === index + 1 ? (
                    <Box
                      as={BiCheckCircle}
                      w={{ base: '0.8rem', md: '1.5rem' }}
                      color="green.500"
                    />
                  ) : (
                    <Box as={BiCopy} w={{ base: '0.8rem', md: '1.5rem' }} />
                  )}

                  <Text fontSize={{ base: '10', md: 'md' }}>
                    {url}/
                    {username && username?.length > 8 ? username?.slice(0, 8) + '...' : username}
                  </Text>
                </HStack>
              ))}
            </SimpleGrid>
            <HStack spacing={4}>
              {socials.map((social, index) => (
                <Box
                  key={index}
                  as={social.icon}
                  w={{ base: '2rem', md: '2.5rem' }}
                  h={{ base: '2rem', md: '2.5rem' }}
                  cursor="pointer"
                  _hover={{ transform: 'scale(1.03)' }}
                  _active={{ transform: 'scale(0.99)' }}
                  transitionDuration="0.2s"
                  onClick={() => {
                    window.open(social.link, '_blank')
                  }}
                />
              ))}
            </HStack>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

export default ShareKyteModal
