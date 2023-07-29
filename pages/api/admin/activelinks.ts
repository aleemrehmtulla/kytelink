import { NextApiRequest, NextApiResponse } from 'next'
import prisma from 'lib/prisma'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const threeDaysAgo = new Date()
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

  const activeKytes = await prisma.kyteProd.findMany({
    where: {
      OR: [
        {
          pageHits: {
            some: {
              timestamp: {
                gte: threeDaysAgo,
              },
            },
          },
        },
        {
          linkHits: {
            some: {
              timestamp: {
                gte: threeDaysAgo,
              },
            },
          },
        },
      ],
    },
    select: {
      name: true,
      pageHits: {
        where: {
          timestamp: {
            gte: threeDaysAgo,
          },
        },
        select: {
          id: true,
        },
      },
    },
  })

  const activeKytesData = activeKytes.map((kyte) => ({
    name: kyte.name,
    totalPageHits: kyte.pageHits.length,
  }))

  // Sort by totalPageHits in descending order
  activeKytesData.sort((a, b) => b.totalPageHits - a.totalPageHits)

  const count = activeKytesData.length

  return res.status(200).json({ count, activeKytesData })
}

export default handler
