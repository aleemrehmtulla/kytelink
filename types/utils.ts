export interface LinkOption {
  name: string
  icon: string
  prefill: string
  username: string
}

export enum Device {
  MOBILE = 'MOBILE',
  TABLET = 'TABLET',
  DESKTOP = 'DESKTOP',
  UNKNOWN = 'UNKNOWN',
}
