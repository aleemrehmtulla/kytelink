import { Box, HStack, Link, Spacer } from '@chakra-ui/react'
import { FaGithub, FaTwitter } from 'react-icons/fa'

const socials = [
  { name: 'Twitter', icon: FaTwitter, link: 'https://twitter.com/kytelink' },
  { name: 'Github', icon: FaGithub, link: 'https://github.com/aleemrehmtulla/kytelink' },
]

const Footer = () => {
  return (
    <HStack w="full" px={{ base: 8, md: 20 }} pb={8} pt={20} spacing={12}>
      <Link pl={2} href="https://kytelink.com">
        kytelink.com
      </Link>
      <Spacer />
      <HStack spacing={4}>
        {socials.map((social, i) => (
          <Box
            _hover={{ opacity: 0.8 }}
            _active={{ opacity: 0.5 }}
            onClick={() => window.open(social.link, '_blank')}
            cursor="pointer"
            transitionDuration="400ms"
            key={i}
            as={social.icon}
            size={24}
          />
        ))}
      </HStack>
    </HStack>
  )
}
export default Footer
