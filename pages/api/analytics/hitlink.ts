import { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { Device } from 'types/utils'

import { AddLinkHit, AddPageHit } from 'controllers/analytics'

const RequestSchema = z.object({
  kyteId: z.string(),
  linkURL: z.string(),
  linkTitle: z.string(),
  referrer: z.string().optional(),
  device: z.nativeEnum(Device).optional(),
})

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const start = Date.now()
  const request = RequestSchema.safeParse(req.body)
  if (!request.success) return res.status(400).json({ error: request.error })

  const { kyteId, referrer, device, linkURL, linkTitle } = request.data

  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress

  await AddLinkHit({
    kyteId,
    referrer,
    ip: ip as string,
    device: device || Device.UNKNOWN,
    linkURL: linkURL.includes('http') ? linkURL : `https://${linkURL}`,
    linkTitle,
  })

  console.log(`[HIT LINK] ${Date.now() - start}ms - ${linkTitle} - ${linkURL}`)

  return res.status(200).json({ success: true })
}

export default handler
