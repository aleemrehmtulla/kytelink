// you have a couple options here:
// 1. setup loops, sendgrid, mailgun, etc and use the code below
// 2. only send emails for auth and use SMPT (see /api/auth/nextauth.ts)
// 3. don't send any emails at all (rm email option in /components/auth)

const TRANSACTIONAL_URL = 'https://app.loops.so/api/v1/transactional'
const LOOPS_API_KEY = process.env.LOOPS_API_KEY

export const sendMagicLink = async (email: string, link: string) => {
  const TRANSACTIONAL_ID = 'cllzh85eg01b9k30pww3y5giy'

  await fetch(TRANSACTIONAL_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${LOOPS_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      transactionalId: TRANSACTIONAL_ID,
      email: email,
      dataVariables: { MagicLink: link },
    }),
  })

  console.log('sent magic link')
}
