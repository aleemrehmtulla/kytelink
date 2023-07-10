import { getUserFromUsername } from 'controllers/getuser'
import type { GetServerSideProps } from 'next'
import { NextSeo } from 'next-seo'

import User from 'components/Kyte'
import { TUser } from 'types/user'
import { getDeviceType } from 'utils/utils'
import { useEffect } from 'react'

const Kyte = (user: TUser) => {
  useEffect(() => {
    fetch(`/api/analytics/hitpage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        kyteId: user.id,
        deviceType: getDeviceType(window.navigator.userAgent),
        referrer: window.location.href,
      }),
    })
  }, [])
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
  if (context.query.user?.includes('edit'))
    return { redirect: { destination: '/edit/links', permanent: false } }

  const username = context.query.user?.toString().toLowerCase()

  const { user, error } = await getUserFromUsername(username as string)

  if (!user || error) {
    console.log('LINE 44 ERRORING')
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

  return { props: user }
}
