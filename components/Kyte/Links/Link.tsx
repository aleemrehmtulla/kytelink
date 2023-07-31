import { MouseEvent } from 'react'
import { Box, Text, Center, Spacer, Flex, Image } from '@chakra-ui/react'
import * as icons from 'react-icons/fa'

import { TLink, TUser } from 'types/user'
import { THEMES } from 'consts/themes'
import DynamicIcon from 'components/DynamicIcon'
import { getDeviceType } from 'lib/utils'
import { getBaseURL } from 'lib/utils'

type LinksProps = { user: TUser; link: TLink; isPreview?: boolean }

const Link = ({ user, link, isPreview }: LinksProps) => {
  const { link: url, color, emoji, title } = link

  const style = THEMES[user.theme as keyof typeof THEMES]

  const handleRedirect = async (e: MouseEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (isPreview) return

    const BASE_URL = getBaseURL(window.location.hostname)

    fetch(BASE_URL + '/api/analytics/hitlink', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kyteId: user.id,
        linkURL: url || '',
        linkTitle: title || '',
        referrer: document.referrer || '',
        device: getDeviceType(window.navigator.userAgent),
      }),
    })

    if (url.includes('http')) {
      window.open(url, '_blank')
    } else {
      window.open(`https://${url}`, '_blank')
    }
  }

  return (
    <Flex
      as="a"
      w="full"
      borderWidth="1px"
      shadow="lg"
      bg={style.link.bg}
      _hover={{ transform: 'scale(1.01)', opacity: 0.8 }}
      _active={{ transform: 'scale(0.99)', opacity: 0.5 }}
      transitionDuration="0.2s"
      borderColor={style.link.border}
      rounded={style.link.rounded}
      py={3}
      px={5}
      cursor="pointer"
      onClick={handleRedirect}
      href={url.includes('http') ? url : `https://${url}`}
    >
      <Center w="full">
        <Center bg={color} w="10" h="10" borderRadius="lg">
          {emoji?.includes('Fa') && (
            <DynamicIcon icon={emoji as keyof typeof icons} size={36} color={style?.icons} />
          )}

          {emoji?.includes('://') && (
            <Image src={emoji} alt="emoji" rounded="md" my={2} objectFit="cover" />
          )}

          {!emoji?.includes('Fa') && !emoji?.includes('://') && (
            <Text fontSize="3xl"> {emoji}</Text>
          )}
        </Center>
        <Spacer />

        <Text
          px={emoji ? 3 : 1}
          textColor={
            user?.customColor && user?.customColor !== 'default'
              ? user?.customColor
              : style.link.text || 'black'
          }
          fontWeight="semibold"
          textAlign="center"
          w="full"
          fontSize="md"
          fontFamily={
            user?.customFont && user?.customFont !== 'default' ? user?.customFont : 'sans-serif'
          }
        >
          {title}
        </Text>

        <Spacer />
        <Box w="10" h="10" />
      </Center>
    </Flex>
  )
}

export default Link
