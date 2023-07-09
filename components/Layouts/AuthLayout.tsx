import { Flex } from '@chakra-ui/react'
import type { NextPage } from 'next'
import { useRouter } from 'next/router'

import AuthHeader from './Headers/AuthHeader'

const AuthLayout: NextPage = ({ children }) => {
  const router = useRouter()
  const isSignup = router.pathname === '/signup' ? true : false
  return (
    <Flex direction="column" align="center" h="100vh">
      <AuthHeader isSignup={isSignup} />
      {children}
    </Flex>
  )
}
export default AuthLayout
