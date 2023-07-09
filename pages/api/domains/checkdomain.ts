import { checkDomainOnVercel } from 'controllers/vercel'
import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const domain = req.body.domain

  const result = await checkDomainOnVercel(domain)

  return res.status(200).json(result)
}
