import Head from "next/head";
import { AuthScreen } from "../components/screens/auth/auth-screen";

export function LoginPage() {
  return (
    <>
      <Head>
        <title>Log in | Kytelink</title>
      </Head>
      <AuthScreen mode="login" />
    </>
  );
}

export default LoginPage;
