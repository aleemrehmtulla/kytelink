import 'styles/globals.css'
import { createContext, ReactElement, ReactNode, useEffect, useState } from 'react'

import { ChakraProvider } from '@chakra-ui/react'
import { NextPage } from 'next'
import type { AppProps } from 'next/app'
import { TUser } from 'types/user'

type NextPageWithLayout = NextPage & { getLayout?: (page: ReactElement) => ReactNode }
type AppPropsWithLayout = AppProps & { Component: NextPageWithLayout }

export const UserContext = createContext({})
export const PublishedKyteContext = createContext({})

const App = ({ Component, pageProps }: AppPropsWithLayout) => {
  const getLayout = Component.getLayout ?? ((page) => page)

  const [user, setUser] = useState<TUser | null>(null)
  const [publishedKyte, setPublishedKyte] = useState<TUser | null>(null)

  const getUserSession = async () => {
    if (!window.location.pathname.includes(`/edit`)) return
    console.log('%cGetting user session', 'color: white; background-color: black; font-size: 20px')
    const getuser = await fetch('/api/auth/getuser')
    const { user, publishedKyte, error } = await getuser.json()

    if (!user || error) {
      console.log('%cNo user found', 'color: white; background-color: black; font-size: 20px')
      return
    }

    setUser(user)
    setPublishedKyte(publishedKyte)
  }

  useEffect(() => {
    if (user === null) getUserSession()
  }, [])

  return (
    <ChakraProvider>
      {getLayout(
        <UserContext.Provider value={{ user, setUser }}>
          <PublishedKyteContext.Provider value={{ publishedKyte, setPublishedKyte }}>
            <Component {...pageProps} />
          </PublishedKyteContext.Provider>
        </UserContext.Provider>
      )}
    </ChakraProvider>
  )
}

export default App
