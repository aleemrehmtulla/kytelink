import { NextApiRequest, NextApiResponse } from 'next'
import prisma from 'utils/prisma'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const domain = req.query.domain as string

  const domainData = await prisma.domains.findFirst({
    where: { domain },
  })

  console.log('domainData: ', domainData)

  if (!domainData || !domainData.userId) {
    return res.status(200).json({ error: 'No domain found', success: false })
  }

  const user = await prisma.kyteProd.findFirst({
    where: { userId: domainData.userId },
    select: { username: true },
  })

  console.log('userData: ', user)

  if (!user || !user.username) {
    return res.status(200).json({ error: 'No user found', success: false })
  }

  return res.status(200).json({ username: user.username, success: true })
}
export default handler
