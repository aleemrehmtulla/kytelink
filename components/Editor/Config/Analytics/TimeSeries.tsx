// This whole file is fked. Refactor it when ya get a chance.
// Everything works perfectly, it's just messy -- am new to chart.js
import { useEffect, useRef, useMemo } from 'react'
import { Box, VStack, Heading, useColorModeValue, HStack, Text, Spinner } from '@chakra-ui/react'
import Chart from 'chart.js/auto'
import { GetTimeSeriesDataReturnData } from 'controllers/analytics'

type TimeSeriesProps = { timeSeries: GetTimeSeriesDataReturnData | undefined }

const TimeSeries = ({ timeSeries }: TimeSeriesProps) => {
  if (!timeSeries) {
    return (
      <VStack
        align="left"
        w="full"
        border="1px"
        borderColor="gray.200"
        rounded="lg"
        p={4}
        spacing={4}
      >
        <Heading fontSize="2xl">Top Traffic Sources</Heading>
        <VStack>
          <Spinner size="lg" />
        </VStack>
      </VStack>
    )
  }

  if (timeSeries.length === 0) {
    return (
      <VStack
        align="left"
        w="full"
        border="1px"
        borderColor="gray.200"
        rounded="lg"
        p={4}
        spacing={4}
      >
        <Heading fontSize="2xl">Total Views Over Time</Heading>

        <HStack w="full" border={1} borderColor="gray.200" borderStyle="dashed" p={4} rounded="lg">
          <Text fontWeight="semibold" fontSize="sm">
            No views yet!
          </Text>
        </HStack>
      </VStack>
    )
  }

  const chartRef = useRef(null) as any
  const borderColor = useColorModeValue('gray.200', 'gray.700')

  const PAGE_DATA = timeSeries as { date: string; views: number }[]

  const dataPoints = PAGE_DATA.map((item) => item.views)
  const max = Math.max(...dataPoints)
  const min = Math.min(...dataPoints)
  const stepSize = PAGE_DATA.length > 4 ? Math.round((max - min) / 5) : 1

  const chartConfiguration = useMemo(
    () => ({
      type: 'line',
      data: {
        labels: PAGE_DATA.map((item) => item.date),
        datasets: [
          {
            data: PAGE_DATA.map((item) => item.views),
            label: 'Page Views',
            borderColor: 'rgb(214,188,250)',
            backgroundColor: 'rgba(0, 0, 0, 0.1)',
            pointRadius: 0,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          tooltip: {
            backgroundColor: 'rgba(0,0,0,0.8)',
            borderColor: 'white',
            borderWidth: 1,
            bodyColor: 'white',
            bodyFont: { size: 14 },
            displayColors: false,
            titleColor: 'white',
            titleFont: { size: 16 },
            callbacks: {
              title: function (context: any) {
                return PAGE_DATA[context[0].dataIndex].date
              },
              label: function (context: any) {
                return `Total page view: ${PAGE_DATA[context.dataIndex].views}`
              },
            },
          },
          legend: { display: false },
        },
        interaction: { mode: 'nearest', axis: 'x', intersect: false },
        hover: { mode: 'nearest', axis: 'x', intersect: false },
        scales: {
          x: {
            grid: { drawOnChartArea: false, drawBorder: false },
            ticks: {
              display: true,
              autoSkip: true,
              maxRotation: 0,
              minRotation: 0,
              padding: 10,
              callback: function (value: any, index: any, values: any) {
                if (PAGE_DATA.length < 4) return PAGE_DATA[index].date
                return index % 2 === 0 ? PAGE_DATA[index].date : ''
              },
            },
          },
          y: {
            grid: {
              drawBorder: false,
              color: function (context: any) {
                const index = context.tick.value
                const dataPoints = context.chart.data.datasets[0].data
                return index < dataPoints.length && dataPoints[index] !== null
                  ? 'rgba(0, 0, 0, 0.1)'
                  : 'rgba(0, 0, 0, 0.1)'
              },
            },
            ticks: { stepSize: stepSize },
          },
        },
      },
    }),
    []
  ) as any

  useEffect(() => {
    if (!chartRef.current) return
    const ctx = chartRef.current.getContext('2d')

    if (chartRef.current.chartInstance) {
      chartRef.current.chartInstance.destroy()
    }

    chartRef.current.chartInstance = new Chart(ctx, chartConfiguration)
  }, [chartConfiguration])

  return (
    <VStack
      align="left"
      w="full"
      border="1px"
      borderColor={borderColor}
      rounded="lg"
      p={4}
      spacing={4}
    >
      <Heading fontSize="2xl">Page views over time</Heading>
      <Box as="canvas" ref={chartRef} />
    </VStack>
  )
}

export default TimeSeries
