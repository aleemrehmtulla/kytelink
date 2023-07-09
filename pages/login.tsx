import { NextPage } from 'next'
import { NextSeo } from 'next-seo'

import AuthComponent from 'components/Auth'
import AuthLayout from 'components/Layouts/AuthLayout'

const Login = () => {
  return (
    <>
      <NextSeo title="Kytelink | Sign In" />
      <AuthComponent isSignup={false} />
    </>
  )
}
export default Login

Login.getLayout = function getLayout(page: NextPage) {
  return <AuthLayout>{page}</AuthLayout>
}
