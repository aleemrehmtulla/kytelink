import ErrorPage from 'components/ErrorPage'
import { useRouter } from 'next/router'

const Error = () => {
  const router = useRouter()
  const message = router.query.error as string
  return <ErrorPage code={401} message={message} />
}

export default Error
