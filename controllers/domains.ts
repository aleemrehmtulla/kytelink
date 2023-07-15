import prisma from 'utils/prisma'

// TODO: temp moving this to /api/fetchdomain -- rethinking structure
// export const getUsernameFromDomain = async (domain: string) => {
//   const domainData = await prisma.domains.findFirst({
//     where: { domain },
//   })

//   if (!domainData || !domainData.userId) return { error: 'No domain found' }

//   const user = await prisma.kyteProd.findFirst({
//     where: { userId: domainData.userId },
//     select: { username: true },
//   })

//   if (!user || !user.username) return { error: 'No user found' }

//   return user.username
// }

export const fetchUserDomains = async (userId: string): Promise<string[]> => {
  const domainData = await prisma.domains.findMany({
    where: { userId },
  })
  // only return an array of strings
  const domains = domainData.map((domain) => domain.domain)

  return domains
}

export const deleteDomainFromDatabase = async (userId: string, domain: string) => {
  await prisma.domains.deleteMany({
    where: {
      domain,
      userId,
    },
  })
}

export const addDomainToDatabase = async (userId: string, domain: string) => {
  await prisma.domains.create({
    data: {
      domain,
      userId,
    },
  })
}
