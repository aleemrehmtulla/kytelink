import { NextApiRequest, NextApiResponse } from 'next'

import { updateKyteEmail } from 'controllers/editkyte'
import { getUserFromNextAuth } from 'controllers/getuser'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (!req.body.email) return res.status(400).json({ error: 'No email found' })

  const { user, error } = await getUserFromNextAuth(req, res)
  if (!user || error) return res.status(400).json({ error })

  await updateKyteEmail(user.id, req.body.email)

  return res.status(200).json({ success: true })
}

export default handler
