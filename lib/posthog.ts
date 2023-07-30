import { PosthogEvents } from 'consts/posthog'
import { PostHog } from 'posthog-node'
import posthog from 'posthog-js'

import { TUser } from 'types/user'

const posthogServer = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY as string, {
  host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
})

type trackingProps = {
  event: PosthogEvents
  id?: string | null
  user?: TUser | null
  properties?: object
}

export function trackServerEvent({ event, id, user, properties }: trackingProps) {
  posthogServer.capture({
    distinctId: id || user?.userId || 'unknown',
    event: event,
    properties: { ...user, ...properties },
  })

  console.log(`[SERVER POSTHOG] ${event}`)
}

export function trackClientEvent({ event, id, user, properties }: trackingProps) {
  if (typeof id == 'string') posthog.identify(id)
  if (user) posthog.identify(user.id)

  posthog.capture(event, { ...user, ...properties })

  console.log(`[CLIENT POSTHOG] ${event}`)
}

export function initializePostHog() {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY as string, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    autocapture: false,
    capture_pageview: false,
  })
}
