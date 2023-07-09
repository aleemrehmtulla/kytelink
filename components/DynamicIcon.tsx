import * as icons from 'react-icons/fa'

type DynamicIconProps = {
  icon: keyof typeof icons
  size?: string | number
  color?: string
}

const DynamicIcon = ({ icon, size, color }: DynamicIconProps) => {
  const Icon = icons[icon]

  return Icon ? <Icon color={color || 'black'} size={size} /> : null
}

export default DynamicIcon
