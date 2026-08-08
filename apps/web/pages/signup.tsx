import Head from "next/head";
import { AuthScreen } from "../components/screens/auth/auth-screen";

export function SignupPage() {
  return (
    <>
      <Head>
        <title>Create your Kytelink</title>
      </Head>
      <AuthScreen mode="signup" />
    </>
  );
}

export default SignupPage;
