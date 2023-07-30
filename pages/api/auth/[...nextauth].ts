import prisma from 'lib/prisma'
import NextAuth from 'next-auth'
import type { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import EmailProvider from 'next-auth/providers/email'
import GitHubProvider from 'next-auth/providers/github'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { trackServerEvent } from 'lib/posthog'
import { PosthogEvents } from 'consts/posthog'
import { cleanPrismaData } from 'lib/utils'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  secret: process.env.SECRET,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
    }),
    EmailProvider({
      server: {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
      },
      from: process.env.SMTP_FROM,
    }),
  ],
  pages: {
    verifyRequest: '/auth/verify',
    error: '/auth/error',
    signIn: '/auth/error',
  },
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email || !account) return false

      const exisitngUser = await prisma.user.findFirst({
        where: {
          email: user.email,
        },
      })

      if (!exisitngUser) return true

      if (exisitngUser) {
        const exisitngAccount = await prisma.account.findFirst({
          where: {
            userId: exisitngUser.id,
            provider: account.provider,
          },
        })

        if (exisitngAccount) return true

        await prisma.account.create({
          data: {
            id: account.id_token,
            userId: exisitngUser.id,
            type: account.type,
            provider: account.provider,
            providerAccountId: account.providerAccountId,
            refresh_token: account.refresh_token,
            access_token: account.access_token,
            expires_at: account.expires_at,
            token_type: account.token_type,
            scope: account.scope,
            id_token: account.id_token,
            session_state: account.session_state,
          },
        })
        return true
      }

      return true
    },
  },
  events: {
    signIn: async ({ user, isNewUser }) => {
      try {
        console.log('SIGN IN EVENT')
        console.log('user:', user)

        trackServerEvent({
          event: PosthogEvents.LOGGED_IN,
          id: user.id,
          properties: { ...user, isNewUser },
        })
      } catch (e) {
        console.log(e)
      }
    },
    createUser: async ({ user }) => {
      await prisma.kyteDraft.create({
        data: {
          userId: user.id,
          email: user.email,
        },
      })

      const kyteUser = await prisma.kyteProd
        .create({
          data: {
            userId: user.id,
            email: user.email,
          },
        })
        .then(cleanPrismaData)

      trackServerEvent({
        event: PosthogEvents.CREATED_ACCOUNT,
        user: kyteUser,
      })
    },
  },
}

export default NextAuth(authOptions)
