import { Box } from '@chakra-ui/react'

import { TIcon, FaIconKey } from 'types/user'
import ICON_OPTIONS from 'consts/icons'
import { THEMES } from 'consts/themes'
import DynamicIcon from 'components/DynamicIcon'
import { getDeviceType, getBaseURL } from 'utils/utils'

type LinksProps = {
  icon: TIcon
  theme: string
  userId: string
  isPreview?: boolean
}

const Icon = ({ icon, theme, userId, isPreview }: LinksProps) => {
  const style = THEMES[theme as keyof typeof THEMES]
  const iconKey = ICON_OPTIONS.find((option) => option.name === icon.name)?.icon as FaIconKey

  const Redirect = async () => {
    if (isPreview) return

    const deviceType = getDeviceType(window.navigator.userAgent)
    const referrer = document.referrer
    const BASE_URL = getBaseURL(window.location.hostname)

    fetch(`${BASE_URL}/api/analytics/hitlink`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kyteId: userId,
        linkURL: icon.url,
        linkTitle: icon.name,
        referrer,
        deviceType,
      }),
    })

    if (icon.url) window.open(icon.url, '_blank')
  }

  return (
    <Box
      cursor="pointer"
      w="fit"
      _hover={{ opacity: 0.8 }}
      _active={{ transform: 'scale(0.95)', opacity: 0.75 }}
      transitionDuration="0.4s"
      onClick={Redirect}
    >
      <DynamicIcon size={24} color={style.icons} icon={iconKey || 'FaGithub'} />
    </Box>
  )
}

export default Icon
