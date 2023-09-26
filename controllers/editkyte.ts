import prisma from 'lib/prisma'
import { TUser } from 'types/user'

export const updateKyteEmail = async (userId: string, email: string) => {
  await prisma.kyteDraft.updateMany({
    where: { userId },
    data: { email },
  })

  await prisma.kyteProd.updateMany({
    where: { userId },
    data: { email },
  })

  await prisma.user.update({
    where: { id: userId },
    data: { email },
  })
}

export const updateDraftKyte = async (userId: string, userData: TUser) => {
  await prisma.kyteDraft.updateMany({
    where: { userId },
    data: {
      username: userData.username || undefined,
      name: userData.name === '' ? null : userData.name || undefined,
      description: userData.description === '' ? null : userData.description || undefined,
      pfp: userData.pfp || undefined,
      blurpfp: userData.blurpfp || undefined,
      theme: userData.theme || undefined,
      customFont: userData.customFont || undefined,
      customColor: userData.customColor || undefined,
      seoTitle: userData.seoTitle === '' ? null : userData.seoTitle || undefined,
      seoDescription: userData.seoDescription === '' ? null : userData.seoDescription || undefined,
      redirectLink: userData.redirectLink === '' ? null : userData.redirectLink || undefined,
      shouldRedirect: userData.shouldRedirect || false,
      links: (userData.links as any) || undefined,
      icons: userData.icons || undefined,
      vcf: userData.vcf || undefined,
    },
  })
}

export const syncDraftToProd = async (userId: string) => {
  const draftData = await prisma.kyteDraft.findFirst({
    where: { userId },
  })

  if (draftData) {
    await prisma.kyteProd.updateMany({
      where: { userId },
      data: {
        username: draftData.username,
        name: draftData.name,
        description: draftData.description,
        pfp: draftData.pfp,
        blurpfp: draftData.blurpfp,
        theme: draftData.theme,
        customFont: draftData.customFont,
        customColor: draftData.customColor,
        seoTitle: draftData.seoTitle,
        seoDescription: draftData.seoDescription,
        redirectLink: draftData.redirectLink,
        shouldRedirect: draftData.shouldRedirect,
        links: draftData.links || undefined,
        icons: draftData.icons || undefined,
        vcf: draftData.vcf || undefined,
      },
    })
  }
}
