import { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'

import { AddPageHit } from 'controllers/analytics'
import { Device } from 'types/utils'

const RequestSchema = z.object({
  kyteId: z.string(),
  referrer: z.string().optional(),
  device: z.nativeEnum(Device).optional(),
  ip: z.string().optional(),
})

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  console.log('hitpage hit')
  const request = RequestSchema.safeParse(req.body)
  if (!request.success) return res.status(400).json({ error: request.error })

  const { kyteId, referrer, device, ip } = request.data

  await AddPageHit({ kyteId, referrer, ip: ip as string, device: device || Device.UNKNOWN })

  return res.status(200).json({ success: true })
}

export default handler
