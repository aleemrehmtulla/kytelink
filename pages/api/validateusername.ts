import { NextApiRequest, NextApiResponse } from 'next'
import { validateUsername } from 'controllers/validations'

type ValidateUsernameRes = { success?: boolean; error?: string }

const handler = async (req: NextApiRequest, res: NextApiResponse<ValidateUsernameRes>) => {
  if (!req.body.username) return res.status(400).json({ error: 'No username provided' })

  const username = req.body.username.toLowerCase()
  const userId = req.body.userId

  const isValid = await validateUsername(username, userId)

  if (!isValid) return res.status(400).json({ error: 'Username already exists' })

  return res.status(200).json({ success: true })
}

export default handler
