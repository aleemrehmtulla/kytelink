import prisma from 'utils/prisma'

export const fetchUserDomains = async (userId: string): Promise<string[]> => {
  const domainData = await prisma.domains.findMany({
    where: { userId },
  })

  const domains = domainData.map((domain: { domain: string }) => domain.domain)

  return domains
}

export const deleteDomainFromDatabase = async (userId: string, domain: string) => {
  await prisma.domains.deleteMany({
    where: { domain, userId },
  })
}

export const addDomainToDatabase = async (userId: string, domain: string) => {
  await prisma.domains.create({
    data: { domain, userId },
  })
}
