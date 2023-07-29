import prisma from 'lib/prisma'
import { NextApiRequest, NextApiResponse } from 'next'
import { getSession } from 'next-auth/react'
import { TUser } from 'types/user'
import { cleanPrismaData } from 'lib/utils'
import { authOptions } from 'pages/api/auth/[...nextauth]'
import { getServerSession } from 'next-auth'

// inspired by supabase :)
export type TUserRes = {
  user?: TUser
  error?: string
}

export const getUserFromSession = async (req: any): Promise<TUserRes> => {
  const session = await getSession({ req })
  if (!session) return { error: 'No session found' }

  if (new Date(session.expires).getTime() < Date.now()) return { error: 'Session expired' }
  if (!session?.user?.email) return { error: 'No email found' }

  const user = await prisma.kyteDraft.findFirst({ where: { email: session.user.email } })
  if (!user) return { error: 'No user found' }

  // determine if the user is new or not
  const creationTime = new Date(user.createdAt)
  const currentTime = new Date()
  const timeDiff = currentTime.getTime() - creationTime.getTime()
  const isNewUser = timeDiff < 1200000 && !user.username

  const userData = {
    ...user,
    id: user?.userId,
    links: user?.links || [],
    icons: user?.icons || [],
    theme: user?.theme || 'default',
    createdAt: null,
    isNewUser,
  }

  return { user: cleanPrismaData(userData) }
}

export const getUserFromNextAuth = async (
  req: NextApiRequest,
  res: NextApiResponse
): Promise<TUserRes> => {
  const session = await getServerSession(req, res, authOptions)

  if (!session?.user?.email) return { error: 'No email found' }

  const user = await prisma.kyteDraft.findFirst({ where: { email: session.user.email } })
  if (!user) throw new Error('No user found')

  // determine if the user is new or not
  const creationTime = new Date(user.createdAt)
  const currentTime = new Date()
  const timeDiff = currentTime.getTime() - creationTime.getTime()
  const isNewUser = timeDiff < 1200000 && !user.username

  const userData = {
    ...user,
    id: user?.userId,
    links: user?.links || [],
    icons: user?.icons || [],
    theme: user?.theme || 'default',
    createdAt: null,
    isNewUser,
  }

  return { user: cleanPrismaData(userData) }
}

export const getUserFromUsername = async (username: string): Promise<TUserRes> => {
  const user = await prisma.kyteProd.findFirst({
    where: { username },
  })

  if (!user) return { error: 'No user found' }

  const userData = {
    ...user,
    id: user?.userId,
    links: user?.links || [],
    icons: user?.icons || [],
    theme: user?.theme || 'default',
    createdAt: null,
    email: null,
  }

  return { user: cleanPrismaData(userData) }
}

export const getPublishedKyteFromId = async (userId: string): Promise<TUserRes> => {
  const user = await prisma.kyteProd.findFirst({
    where: { userId },
  })

  if (!user) return { error: 'No user found' }

  const userData = {
    ...user,
    id: user?.userId,
    links: user?.links || [],
    icons: user?.icons || [],
    theme: user?.theme || 'default',
    createdAt: null,
  }

  return { user: cleanPrismaData(userData) }
}
