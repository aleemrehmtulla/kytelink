import { CUSTOM_DOMAINS, HOSTS } from 'consts/middleware'
import { NextRequest, NextResponse } from 'next/server'
import { getBaseURL } from 'utils/utils'

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
  const fetchUser = await fetch(`${BASE_URL}/api/fetchdomain`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      domain: hostname,
    }),
  })

  const userId = await fetchUser.json()

  if (!userId) return NextResponse.redirect('https://kytelink.com')

  url.pathname = `/${userId}`
  return NextResponse.rewrite(url)
}

export default middleware
