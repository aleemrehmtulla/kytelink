import { NextApiRequest, NextApiResponse } from 'next'

import {
  GetCountryHits,
  GetCountryHitsReturnData,
  GetDeviceHits,
  GetDeviceHitsReturnData,
  GetLinkHits,
  GetLinkHitsReturnData,
  GetPageHits,
  GetPageHitsReturnData,
  GetTimeSeriesData,
  GetTrafficSources,
  GetTrafficSourcesReturnData,
} from 'controllers/analytics'

import { getUserFromNextAuth } from 'controllers/getuser'

export type AnalyticAPIReturnData = {
  success?: boolean
  error?: string
  totalHits?: GetPageHitsReturnData
  topLinks?: GetLinkHitsReturnData
  topCountries?: GetCountryHitsReturnData
  topDevices?: GetDeviceHitsReturnData
  trafficSources?: GetTrafficSourcesReturnData
  timeSeriesData?: any
}

const handler = async (req: NextApiRequest, res: NextApiResponse<AnalyticAPIReturnData>) => {
  const { user } = await getUserFromNextAuth(req, res)
  if (!user) return res.status(400).json({ error: 'No user found' })

  const kyteId = user.id

  console.log('/api/analytics/getdata hit for:', kyteId)

  const totalHits = await GetPageHits(kyteId)

  const topLinks = await GetLinkHits(kyteId)

  const topCountries = await GetCountryHits(kyteId)

  const topDevices = await GetDeviceHits(kyteId)

  const topTrafficSources = await GetTrafficSources(kyteId)

  const timeSeriesData = await GetTimeSeriesData(kyteId)

  return res.status(200).json({
    success: true,
    totalHits,
    topLinks,
    topCountries,
    topDevices,
    trafficSources: topTrafficSources,
    timeSeriesData,
  })
}

export default handler
