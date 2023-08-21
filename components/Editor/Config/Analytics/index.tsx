import { useEffect, useState } from 'react'
import { VStack } from '@chakra-ui/react'

import PageViews from './PageViews'
import LinkClicks from './LinkClicks'
import TrafficSources from './TrafficSources'
import TimeSeries from './TimeSeries'

import { AnalyticAPIReturnData } from 'pages/api/analytics/getdata'

const Analyitcs = () => {
  const [analyticData, setAnalyticData] = useState<AnalyticAPIReturnData | null>(null)

  const hitAPI = async () => {
    const apiResponse = await fetch('/api/analytics/getdata')
    const data = await apiResponse.json()
    setAnalyticData(data)
  }

  console.log(analyticData)
  useEffect(() => {
    if (analyticData === null) hitAPI()
  }, [])

  return (
    <>
      <VStack align="left" spacing={4}>
        <PageViews totalPageViews={analyticData?.totalHits} />
        <TimeSeries timeSeries={analyticData?.timeSeriesData} />
        <LinkClicks totalLinkClicks={analyticData?.topLinks} />
        <TrafficSources trafficSources={analyticData?.trafficSources} />
      </VStack>
    </>
  )
}
export default Analyitcs
