import { Flex, Box, Text, Spacer, Center, Image } from '@chakra-ui/react'
import { BsPencilSquare } from 'react-icons/bs'

import { FaIconKey, TLink } from 'types/user'
import DynamicIcon from 'components/DynamicIcon'

const Link = ({ linkData }: { linkData: TLink }) => {
  const { color, emoji } = linkData

  return (
    <Flex
      borderWidth="1px"
      transitionDuration="0.2s"
      _hover={{ transform: 'scale(1.01)' }}
      bg="white"
      align="center"
      w="full"
      px={8}
      py={4}
      borderColor="gray.200"
      borderStyle="solid"
      borderRadius="4px"
    >
      <Center bg={color} w="10" h="10" borderRadius="lg">
        {emoji?.includes('Fa') && <DynamicIcon icon={emoji as FaIconKey} size={36} />}

        {emoji?.includes('://') && (
          <Image src={emoji} alt="emoji" rounded="md" my={2} objectFit="cover" />
        )}

        {!emoji?.includes('Fa') && !emoji?.includes('://') && <Text fontSize="3xl">{emoji}</Text>}
      </Center>
      <Spacer />
      <Text fontWeight="semibold" fontSize="xl">
        {linkData.title}
      </Text>
      <Spacer />
      <Box w="8" cursor="grab" _active={{ cursor: 'grabbing' }}>
        <BsPencilSquare size="sm" />
      </Box>
    </Flex>
  )
}

export default Link
