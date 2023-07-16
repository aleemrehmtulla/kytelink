// tempoary fix -- planning to move to drizzle
import { neon } from '@neondatabase/serverless'

export const config = { runtime: 'edge' }

export default async (req: Request) => {
  const url = new URL(req.url)
  const domain = url.searchParams.get('domain')
  const sql = neon(process.env.DATABASE_URL!)

  try {
    const domainDataArray = await sql`SELECT * FROM "Domains" WHERE "domain" = ${domain}`
    const domainData = domainDataArray[0]

    if (!domainData || !domainData.userId) throw new Error('No domain found')

    const userArray = await sql`
      SELECT "username" FROM "KyteProd" WHERE "userId" = ${domainData.userId}
    `
    const user = userArray[0]

    if (!user || !user.username) throw new Error('No user found')

    return new Response(JSON.stringify({ username: user.username, success: true }), {
      headers: { 'content-type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ success: false }), {
      headers: { 'content-type': 'application/json' },
    })
  }
}
