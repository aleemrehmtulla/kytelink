import prisma from 'utils/prisma'

export const getUsernameFromDomain = async (domain: string) => {
  const domainData = await prisma.domains.findFirst({
    where: { domain },
  })

  const user = await prisma.kyteProd.findFirst({
    where: { userId: domainData?.userId },
  })

  if (!user) return { error: 'No user found' }

  return user.username || false
}

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
