import { HStack, Input, Text, VStack } from '@chakra-ui/react'
import { TLink, TUser } from 'types/user'

type StarterLinksProps = {
  user: TUser
  setUser: (user: TUser) => void
}

const StarterLinks = ({ user, setUser }: StarterLinksProps) => {
  const handleAddStarterLink = (platform: string, link: string) => {
    const links = user.links || []
    const newLink: TLink = { link: link, title: platform }

    const linkIndex = links.findIndex((link) => link.title === platform)

    if (linkIndex > -1) {
      links[linkIndex] = newLink
    } else {
      links.push(newLink)
    }

    setUser({ ...user, links: links })
  }
  return (
    <VStack spacing={2} w="full" align="left">
      <HStack>
        <Text fontSize="md" textAlign="left" textColor="gray.700" fontWeight="semibold">
          Starter Links{' '}
        </Text>
        <Text fontSize="sm" textColor="red.500" fontWeight="normal">
          (1 required)
        </Text>
      </HStack>
      {['Link 1', 'Link 2', 'Link 3'].map((platform) => (
        <Input
          _focus={{
            bg: 'gray.100',
            borderColor: 'gray.500',
          }}
          value={user.links?.find((link) => link.title === platform)?.link}
          onChange={(e) => handleAddStarterLink(platform, e.target.value)}
          placeholder={platform}
        />
      ))}
    </VStack>
  )
}
export default StarterLinks
