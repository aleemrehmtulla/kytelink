import { deleteDomainFromDatabase } from 'controllers/domains'
import { getUserFromNextAuth } from 'controllers/getuser'
import { deleteDomainFromVercel } from 'controllers/vercel'
import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { user, error } = await getUserFromNextAuth(req, res)
  if (!user || error) return res.status(400).json({ error })

  const domain = req.body.domain
  const isSubdomain = domain.split('.').length > 2

  if (!isSubdomain) {
    await deleteDomainFromVercel(`www.${domain}`)
    await deleteDomainFromDatabase(user.id, `www.${domain}`)
  }

  await deleteDomainFromDatabase(user.id, domain)
  await deleteDomainFromVercel(domain)

  return res.status(200).json({ success: true })
}
