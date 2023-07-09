import { useContext, useEffect, useState } from 'react'

import { useRouter } from 'next/router'

import EditorHeader from 'components/Layouts/Headers/EditorHeader'
import LoadingScreen from 'components/Auth/LoadingScreen'

import { UserContextType } from 'types/user'
import { UserContext } from 'pages/_app'
import NoUserScreen from 'components/Auth/NoUserScreen'
import { NextSeo } from 'next-seo'
import Editor from 'components/Editor'

const Edit = () => {
  const { user, setUser } = useContext(UserContext) as UserContextType

  const router = useRouter()
  const [route, setRoute] = useState<string | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (router.query.edit && router.query.edit.length > 2) {
      setRoute(router.query.edit as string)
    }

    const timer = setTimeout(() => {
      if (!user) setError(true)
    }, 7000)

    return () => clearTimeout(timer)
  }, [router.query.edit])

  if (error && !user) return <NoUserScreen />
  if (route === null || !user) return <LoadingScreen />

  return (
    <>
      <NextSeo title="Kytelink | Edit" />
      <EditorHeader user={user} />
      <Editor user={user} setUser={setUser} route={route} />
    </>
  )
}

export default Edit
