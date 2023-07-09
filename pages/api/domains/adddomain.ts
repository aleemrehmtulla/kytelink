import { addDomainToDatabase } from 'controllers/domains'
import { getUserFromNextAuth } from 'controllers/getuser'
import { addDomainToVercel } from 'controllers/vercel'
import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { user, error } = await getUserFromNextAuth(req, res)
  if (!user || error) return res.status(400).json({ error })

  const domain = req.body.domain
  const isSubdomain = domain.split('.').length > 2

  if (!isSubdomain) {
    const json = await addDomainToVercel(`www.${domain}`)
    if (json.createdAt) {
      await addDomainToDatabase(user.id, `www.${domain}`)
      await addDomainToVercel(domain)
      await addDomainToDatabase(user.id, domain)
      return res.status(200).json({ success: true, json })
    } else {
      return res.status(400).json({ error: 'Domain already exists' })
    }
  }

  const json = await addDomainToVercel(domain)

  if (json.createdAt) {
    await addDomainToDatabase(user.id, domain)
    return res.status(200).json({ success: true, json })
  }

  return res.status(400).json({ error: 'Domain already exists' })
}
