import { NextPage } from 'next'
import { NextSeo } from 'next-seo'

import AuthComponent from 'components/Auth'
import AuthLayout from 'components/Layouts/AuthLayout'

const Signup = () => {
  return (
    <>
      <NextSeo title="Kytelink | Signup" />
      <AuthComponent isSignup={true} />
    </>
  )
}
export default Signup

Signup.getLayout = function getLayout(page: NextPage) {
  return <AuthLayout>{page}</AuthLayout>
}
