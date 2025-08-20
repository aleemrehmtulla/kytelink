import { CUSTOM_DOMAINS, HOSTS } from 'consts/middleware'
import { NextRequest, NextResponse } from 'next/server'
import { getBaseURL } from 'lib/utils'

async function middleware(request: NextRequest) {
  // clone the request url
  const url = request.nextUrl.clone()

  // get pathname of request [/cool]
  const { pathname } = request.nextUrl

  // get host name [aleem.com]
  const hostname = request.headers.get('host')
  if (!hostname) return NextResponse.redirect('https://tradlink.com')

  // get our base url [https://tradlink.com]
  const BASE_URL = getBaseURL(hostname)

  // if the domain is a customdomain, and it's root path, redirect to tradlink.com
  if (CUSTOM_DOMAINS.includes(hostname) && pathname === '/') {
    return NextResponse.redirect('https://tradlink.com')
  }

  // if the domain is a host, treat it as normal
  if (
    HOSTS.includes(hostname) ||
    CUSTOM_DOMAINS.includes(hostname) ||
    hostname?.includes('vercel.app') ||
    hostname?.includes('ngrok')
  ) {
    return NextResponse.next()
  }

  // some safety checks
  const doNotRedirect = ['images/', 'favicon.png', 'fonts/', 'api/', '_next/']
  if (doNotRedirect.some((directory) => pathname.startsWith(`/${directory}`))) {
    console.log('not redirecting' + pathname)
    return NextResponse.next()
  }

  // go fetch the which user this domain belongs to
  try {
    const fetchUser = await fetch(`${BASE_URL}/api/fetchdomain?domain=${hostname}`)
    const user = await fetchUser.json()

    if (!user.success || !user.username) {
      console.log('no user found')
      console.log(user)
      return NextResponse.redirect('https://tradlink.com')
    }

    url.pathname = `/${user.username}`
    return NextResponse.rewrite(url)
  } catch (e) {
    console.log(e)
    throw new Error('Error fetching domain')
  }
}

export default middleware
