import { fetchUserDomains } from 'controllers/domains'
import { getUserFromNextAuth } from 'controllers/getuser'
import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!req.body.userId) return res.status(400).json({ error: 'userId is required' })

  const domains = await fetchUserDomains(req.body.userId)

  return res.status(400).json(domains)
}
