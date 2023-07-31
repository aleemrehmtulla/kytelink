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
  if (!hostname) return NextResponse.redirect('https://kytelink.com')

  // get our base url [https://kytelink.com]
  const BASE_URL = getBaseURL(hostname)

  // if it's a /ingest, rewrite to posthog
  if (pathname.startsWith('/ingest')) {
    console.log('INGESTING DATA!!!!')

    const hostname = 'app.posthog.com' // or 'eu.posthog.com'
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('host', hostname)

    let url = request.nextUrl.clone()
    url.protocol = 'https'
    url.hostname = hostname
    url.port = '443'
    url.pathname = url.pathname.replace(/^\/ingest/, '')

    return NextResponse.rewrite(url, { headers: requestHeaders })
  }

  // if the domain is a customdomain, and it's root path, redirect to kytelink.com
  if (CUSTOM_DOMAINS.includes(hostname) && pathname === '/') {
    return NextResponse.redirect('https://kytelink.com')
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
    return NextResponse.next()
  }

  // go fetch the which user this domain belongs to
  try {
    const fetchUser = await fetch(`${BASE_URL}/api/fetchdomain?domain=${hostname}`)
    const user = await fetchUser.json()

    if (!user.success || !user.username) {
      console.log('no user found')
      console.log(user)
      return NextResponse.redirect('https://kytelink.com')
    }

    url.pathname = `/${user.username}`
    return NextResponse.rewrite(url)
  } catch (e) {
    console.log(e)
    throw new Error('Error fetching domain')
  }
}

export default middleware
