import * as icons from 'react-icons/fa'

export type TUser = {
  id: string
  email?: string
  createdAt: Date | string
  username?: string
  name: string
  description: string
  pfp: string
  theme: string
  customFont?: string
  customColor?: string
  redirectLink?: string
  shouldRedirect?: boolean
  links: TLink[]
  icons: TIcon[]
  isNewUser: boolean
  vcf?: Vcf | null
  domains?: string[]
  isPreview?: boolean
}
export type TLink = {
  color?: string
  emoji: string
  link: string
  title: string
  isPreview?: boolean
  value?: unknown
}

export type TIcon = {
  name: keyof typeof icons
  url: string | null | undefined
  isPreview?: boolean
}

export type FaIconKey = keyof typeof icons

export type UserContextType = {
  user: TUser | null
  setUser: React.Dispatch<React.SetStateAction<TUser | null>>
}
export type TPublishedKyteContext = {
  publishedKyte: TUser | null
  setPublishedKyte: React.Dispatch<React.SetStateAction<TUser | null>>
}

export type Vcf = {
  firstName?: string
  lastName?: string
  birthday?: string
  email?: string
  phone?: string
  company?: string
  note?: string
}
