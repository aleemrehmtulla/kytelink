import { Device } from 'types/utils'

export const getBaseURL = (host?: string) => {
  if (!host || host.includes('vercel.app')) {
    if (!process.env.NEXT_PUBLIC_VERCEL_URL) return 'https://tradlink.com'

    if (process.env.NEXT_PUBLIC_VERCEL_URL.includes('localhost')) {
      return 'http://localhost:3000'
    }

    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
  }

  if (host.includes('localhost')) return 'http://localhost:3000'
  return `https://${host}`
}

export const getDeviceType = (userAgent?: string): Device => {
  let deviceType = Device.UNKNOWN

  if (!userAgent) return deviceType

  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(userAgent)) {
    deviceType = Device.TABLET
  } else if (
    /Mobile|iP(hone|od|ad)|Android|BlackBerry|IEMobile|Kindle|NetFront|Silk-Acceleration|(HPwOS|webOS|BrowserNG|BB10|xoom|P160U|SCH-I800|Nexus 10)/i.test(
      userAgent
    )
  ) {
    deviceType = Device.MOBILE
  } else if (
    /Chrome|Firefox|Safari|Opera|MSIE|Edge|IEMobile|Windows Phone|Trident/i.test(userAgent)
  ) {
    deviceType = Device.DESKTOP
  }

  return deviceType
}

export function cleanPrismaData(obj: any) {
  for (const key in obj) {
    if (typeof obj[key] === 'bigint') {
      obj[key] = Number(obj[key])
    } else if (obj[key] instanceof Date) {
      obj[key] = obj[key].toISOString()
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      cleanPrismaData(obj[key])
    }
  }

  return obj
}
