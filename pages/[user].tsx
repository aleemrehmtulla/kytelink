import { getUserFromUsername } from 'controllers/getuser'
import type { GetServerSideProps } from 'next'
import { NextSeo } from 'next-seo'
import { getDeviceType } from 'utils/utils'

import User from 'components/Kyte'
import { TUser } from 'types/user'
import { AddPageHit } from 'controllers/analytics'

const Kyte = (user: TUser) => {
  return (
    <>
      <NextSeo
        title={`${user.name || user.username} | Kytelink`}
        description={`Check out ${user.name || user.username}'s kyte to grab their links!`}
        canonical={`https://kytelink.com/${user.username}`}
      />
      <User user={user} />
    </>
  )
}

export default Kyte

export const getServerSideProps: GetServerSideProps = async (context) => {
  const start = Date.now()
  if (context.query.user?.includes('edit'))
    return { redirect: { destination: '/edit/links', permanent: false } }

  const username = context.query.user?.toString().toLowerCase()

  const { user, error } = await getUserFromUsername(username as string)

  console.log('Millisecs to get user', Date.now() - start)

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
  console.log('Millisecs to get to 56', Date.now() - start)

  AddPageHit({
    kyteId: user.id,
    device: getDeviceType(context.req.headers['user-agent']),
    referrer: context.req.headers.referer || '',
    ip: (context.req.headers['x-forwarded-for'] as string) || context.req.socket.remoteAddress,
  })

  console.log('Millisecs to finish ssr', Date.now() - start)

  return { props: user }
}
