// currently not used, playing around with custom adapters
import { Prisma, PrismaClient } from '@prisma/client'
import type { Adapter } from '@auth/core/adapters'

export function CustomPrismaAdapter(prismaClient: PrismaClient): Adapter {
  return {
    createUser: (data) => prismaClient.user.create({ data }) as any,
    getUser: (id) => prismaClient.user.findFirst({ where: { id } }) as any,
    getUserByEmail: (email) => prismaClient.user.findUnique({ where: { email } }) as any,

    // @ts-ignore
    async getUserByAccount(providerId: any, providerAccountId: any) {
      const account = await prismaClient.account.findFirst({
        where: { providerAccountId: providerId.providerAccountId },
        select: { user: true },
      })
      console.log('account:', account)
      return account?.user ?? null
    },
    async getSessionAndUser(sessionToken) {
      const userAndSession = await prismaClient.session.findFirst({
        where: { sessionToken },
        include: { user: true },
      })
      if (!userAndSession) return null
      const { user, ...session } = userAndSession
      return { user, session } as any
    },
    createSession: (data) => prismaClient.session.create({ data }),
    updateSession: (data) =>
      prismaClient.session.update({ where: { sessionToken: data.sessionToken }, data }),
    deleteSession: async (sessionToken) => {
      return (await prismaClient.session.deleteMany({ where: { sessionToken } })) as any
    },

    async createVerificationToken(data) {
      const verificationToken = await prismaClient.verificationToken.create({ data })
      // @ts-expect-errors // MongoDB needs an ID, but we don't
      if (verificationToken.id) delete verificationToken.id
      return verificationToken
    },
    async useVerificationToken(identifier_token) {
      try {
        const verificationToken = await prismaClient.verificationToken.delete({
          where: { identifier_token },
        })
        // @ts-expect-errors // MongoDB needs an ID, but we don't
        if (verificationToken.id) delete verificationToken.id
        return verificationToken
      } catch (error) {
        // If token already used/deleted, just return null
        // https://www.prisma.io/docs/reference/api-reference/error-reference#p2025
        if ((error as Prisma.PrismaClientKnownRequestError).code === 'P2025') return null
        throw error
      }
    },
  }
}
