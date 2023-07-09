import { getUsernameFromDomain } from 'controllers/domains'
import { NextApiRequest, NextApiResponse } from 'next'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { domain } = req.body

  const username = await getUsernameFromDomain(domain)

  if (!username) return res.status(400).json(false)

  return res.status(200).json(username)
}
export default handler
