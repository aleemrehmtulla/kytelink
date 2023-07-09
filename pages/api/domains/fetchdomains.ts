import { fetchUserDomains } from 'controllers/domains'
import { getUserFromNextAuth } from 'controllers/getuser'
import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { user, error } = await getUserFromNextAuth(req, res)
  if (!user || error) return res.status(400).json({ error })

  const domains = await fetchUserDomains(user.id)

  return res.status(400).json(domains)
}
