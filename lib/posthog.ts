// posthog is a 3rd party analytics tool that we use to track user events
// feel free to remove the captures in trackServerEvent and trackClientEvent
// if you don't, you need to fill in your .env with credentials from posthog.com
import { PosthogEvents } from 'consts/posthog'
import { PostHog } from 'posthog-node'
import posthog from 'posthog-js'

import { TUser } from 'types/user'

const posthogServer = process.env.NEXT_PUBLIC_POSTHOG_KEY
  ? new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY as string, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    })
  : null

type trackingProps = { event: PosthogEvents; id?: string; user?: TUser | null; properties?: object }

export function trackServerEvent({ event, id, user, properties }: trackingProps) {
  if (posthogServer) {
    posthogServer.capture({
      distinctId: id || user?.userId || 'unknown',
      event: event,
      properties: { ...user, ...properties },
    })
    
    console.log(`[SERVER POSTHOG] ${event}`)
  } else {
    console.log(`[NO POSTHOG SERVER DID NOT TRACK] ${event}`)
  }
}

export function trackClientEvent({ event, id, user, properties }: trackingProps) {
  if (typeof id == 'string') posthog.identify(id, { ...user })
  if (user && user.id) posthog.identify(user.id, { ...user })
  if (user && user.userId) posthog.identify(user.userId, { ...user })

  posthog.capture(event, { ...user, ...properties })

  console.log(
    `%c[CLIENT POSTHOG] ${event}`,
    'background: black; color: white; font-size: 16px; padding: 4px 8px; border-radius: 4px;'
  )
}

export function initializePostHog() {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY as string, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    autocapture: false,
    capture_pageview: false,
  })
}
