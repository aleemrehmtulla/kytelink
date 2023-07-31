import { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { Device } from 'types/utils'

import { AddLinkHit, AddPageHit } from 'controllers/analytics'
import { trackServerEvent } from 'lib/posthog'
import { PosthogEvents } from 'consts/posthog'

const RequestSchema = z.object({
  kyteId: z.string(),
  username: z.string(),
  linkURL: z.string(),
  linkTitle: z.string(),
  referrer: z.string().optional(),
  device: z.nativeEnum(Device).optional(),
})

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const start = Date.now()
  const request = RequestSchema.safeParse(req.body)
  if (!request.success) return res.status(400).json({ error: request.error })

  const { kyteId, referrer, device, linkURL, linkTitle, username } = request.data

  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress

  await AddLinkHit({
    kyteId,
    referrer,
    ip: ip as string,
    device: device || Device.UNKNOWN,
    linkURL: linkURL.includes('http') ? linkURL : `https://${linkURL}`,
    linkTitle,
  })

  trackServerEvent({
    event: PosthogEvents.KYTE_LINK_HIT,
    id: ip as string,
    properties: { kyteId, referrer, ip, device, linkURL, linkTitle, username },
  })

  console.log(`[HIT LINK] ${Date.now() - start}ms - ${linkTitle} - ${linkURL}`)

  return res.status(200).json({ success: true })
}

export default handler
