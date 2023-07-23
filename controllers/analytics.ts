import prisma from 'utils/prisma'
import { Device } from 'types/utils'

import { addDays, format } from 'date-fns'

type TPageHit = {
  kyteId: string
  referrer?: string
  ip?: string
  device?: Device
}

type TLinkHit = {
  kyteId: string
  linkURL: string
  linkTitle: string
  referrer?: string
  ip?: string
  device?: Device
}

export const AddPageHit = async ({ kyteId, referrer, ip, device }: TPageHit) => {
  console.log('Adding page hit')
  console.log('kyteId:', kyteId)
  console.log('referrer:', referrer)
  console.log('ip:', ip)
  console.log('device:', device)

  prisma.hitPage
    .create({
      data: { kyteId, referrer: referrer || '', ip: ip || '', device: device || Device.UNKNOWN },
    })
    .then((pageHit) => {
      console.log('Page hit added:', pageHit)
    })
    .catch((error) => {
      console.log('Error adding page hit:', error)
    })
}

export const AddLinkHit = async ({
  kyteId,
  referrer,
  ip,
  device,
  linkURL,
  linkTitle,
}: TLinkHit) => {
  const linkHit = await prisma.hitLink.create({
    data: {
      kyteId,
      referrer,
      ip,
      device,
      linkURL,
      linkTitle,
    },
  })

  if (!linkHit) return { error: 'Error adding page hit' }

  return linkHit
}

export type GetPageHitsReturnData = number
export const GetPageHits = async (kyteId: string) => {
  const pageHits = await prisma.hitPage.count({
    where: {
      kyteId,
    },
  })

  if (!pageHits) return 0

  return pageHits
}

// this is a bit yucky, try to type it better
export type GetTimeSeriesDataReturnData = Array<{ date: string; views: number }>
export const GetTimeSeriesData = async (kyteId: string) => {
  const thirtyDaysAgo = addDays(new Date(), -30)

  const rawTimeSeriesData = await prisma.hitPage.groupBy({
    by: ['timestamp'],
    where: { kyteId, timestamp: { gte: thirtyDaysAgo } },
    _count: { timestamp: true },
    orderBy: { timestamp: 'asc' },
  })

  const sanitizedData = rawTimeSeriesData.map(({ timestamp, _count }) => ({
    date: format(timestamp, 'MM/dd'),
    views: _count.timestamp,
  })) as Array<{ date: string; views: number }>

  const reducedData = sanitizedData.reduce(
    (acc: Array<{ date: string; views: number }>, { date, views }) => {
      const item = acc.find((item: { date: string; views: number }) => item.date === date)

      if (item) item.views += views
      else acc.push({ date, views })

      return acc
    },
    []
  )
  const cumulativeData = reducedData.reduce(
    (acc: Array<{ date: string; views: number }>, curr, i) => {
      const views = i > 0 ? curr.views + acc[i - 1].views : curr.views

      acc.push({ ...curr, views })

      return acc
    },
    []
  )

  console.log('Cumulative Time Series Data:', cumulativeData)

  return cumulativeData
}

export type GetLinkHitsReturnData = Array<{ url: string; title: string; count: number }>
export const GetLinkHits = async (kyteId: string): Promise<GetLinkHitsReturnData> => {
  const linkHits = await prisma.hitLink.groupBy({
    by: ['linkURL', 'linkTitle'],
    where: {
      kyteId,
    },
    _count: {
      linkURL: true,
    },
  })

  const sanitizedLinkHits = linkHits.map((linkHit) => {
    return {
      url: linkHit.linkURL,
      title: linkHit.linkTitle,
      count: linkHit._count.linkURL,
    }
  }) as GetLinkHitsReturnData

  return sanitizedLinkHits
}

export type GetCountryHitsReturnData = Array<{ country: string; count: number }>
export const GetCountryHits = async (kyteId: string): Promise<GetCountryHitsReturnData> => {
  // return array of how many times each country hit the page
  const countryHits = await prisma.hitPage.groupBy({
    by: ['country'],
    where: {
      kyteId,
    },
    _count: {
      country: true,
    },
  })

  const sanitizedCountryHits = countryHits.map((countryHit) => {
    return {
      country: countryHit.country,
      count: countryHit._count.country,
    }
  }) as GetCountryHitsReturnData

  return sanitizedCountryHits
}

export type GetTrafficSourcesReturnData = Array<{ referrer: string; count: number }>
export const GetTrafficSources = async (kyteId: string): Promise<GetTrafficSourcesReturnData> => {
  // return array of how many times each country hit the page
  const trafficSources = await prisma.hitPage.groupBy({
    by: ['referrer'],
    where: {
      kyteId,
    },
    _count: {
      referrer: true,
    },
  })

  const sanitizedTrafficSources = trafficSources
    .map((trafficSources) => {
      return {
        referrer: trafficSources.referrer,
        count: trafficSources._count.referrer,
      }
    })
    .filter((trafficSource) => trafficSource.referrer !== null)
    .filter((trafficSource) => trafficSource.referrer !== '')
    .sort((a, b) => b.count - a.count)
    .slice(0, 5) as GetTrafficSourcesReturnData

  return sanitizedTrafficSources
}

export type GetDeviceHitsReturnData = Array<{ device: Device; count: number }>
export const GetDeviceHits = async (kyteId: string): Promise<GetDeviceHitsReturnData> => {
  // return array of how many times each device hit the page
  const deviceHits = await prisma.hitPage.groupBy({
    by: ['device'],
    where: {
      kyteId,
    },
    _count: {
      device: true,
    },
  })

  const sanitizedDeviceHits = deviceHits.map((deviceHit) => {
    return {
      device: deviceHit.device,
      count: deviceHit._count.device,
    }
  }) as GetDeviceHitsReturnData

  return sanitizedDeviceHits
}
