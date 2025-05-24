import { getUserFromUsername } from 'controllers/getuser'
import type { GetServerSideProps } from 'next'
import { NextSeo } from 'next-seo'
import { getDeviceType } from 'lib/utils'

import User from 'components/Kyte'
import { TUser } from 'types/user'
import { AddPageHit } from 'controllers/analytics'
import { Icon, Heading, VStack, Link, Text, Box } from '@chakra-ui/react'
import { FaExclamationTriangle } from 'react-icons/fa'

const Kyte = (user: TUser) => {
  if (user.banned) {
    return (
      <>
        <NextSeo
          title={user.seoTitle || `${user.name || user.username} | Kytelink`}
          description={user.seoDescription || `Check out ${user.name}'s kyte to grab their links!`}
          canonical={`https://kytelink.com/${user.username}`}
        />
        <Box
          p={[4, 6, 8, 10]}
          maxW={['100%', '90%', 'xl']}
          mx={[2, 'auto']}
          mt={[6, 8, 12, 16]}
          borderRadius={['md', 'lg']}
          bg="red.50"
          border="1px solid"
          borderColor="red.200"
        >
          <VStack spacing={[2, 3, 4]} align="center" w="full">
            <Icon
              as={FaExclamationTriangle}
              w={[6, 8, 10, 12]}
              h={[6, 8, 10, 12]}
              color="red.500"
            />
            <Heading
              fontSize={['md', 'lg', 'xl', '2xl']}
              textAlign="center"
              color="red.700"
              px={[2, 4]}
            >
              This page has been blocked
            </Heading>
            <Text fontSize={['xs', 'sm', 'md']} textAlign="center" color="red.600" px={[2, 4]}>
              This page has been blocked due to phishing reports. If you believe this is a mistake,
              please{' '}
              <Link
                href="https://twitter.com/aleemrehmtulla"
                isExternal
                color="red.700"
                fontWeight="bold"
              >
                DM @aleemrehmtulla on Twitter
              </Link>
              .
            </Text>
          </VStack>
        </Box>
      </>
    )
  }

  return (
    <>
      <NextSeo
        title={user.seoTitle || `${user.name || user.username} | Kytelink`}
        description={user.seoDescription || `Check out ${user.name}'s kyte to grab their links!`}
        canonical={`https://kytelink.com/${user.username}`}
      />
      <User user={user} />
    </>
  )
}

export default Kyte

export const getServerSideProps: GetServerSideProps = async (context) => {
  const start = Date.now()
  if (context.query.user === 'edit')
    return { redirect: { destination: '/edit/links', permanent: false } }

  const username = context.query.user?.toString().toLowerCase()

  const { user, error } = await getUserFromUsername(username as string)

  console.log('Millisecs to get user from DB', Date.now() - start)

  if (!user || error) {
    console.log('error on ssr [user].tsx', error)
    return {
      redirect: {
        destination: '/404',
        permanent: false,
      },
    }
  }

  if (user.shouldRedirect && user.redirectLink) {
    const redirectURL = user.redirectLink.includes('http')
      ? user.redirectLink
      : `https://${user.redirectLink}`
    return {
      redirect: {
        destination: redirectURL,
        permanent: false,
      },
    }
  }

  if (!user.banned) {
    await AddPageHit({
      kyteId: user.id,
      username: user.username || '',
      device: getDeviceType(context.req.headers['user-agent']),
      referrer: context.req.headers.referer || '',
      ip: (context.req.headers['x-forwarded-for'] as string) || context.req.socket.remoteAddress,
    })
  }

  console.log('Millisecs to finish ssr', Date.now() - start)

  return { props: user }
}
