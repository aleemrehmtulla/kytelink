import Head from "next/head";
import { AccountScreen } from "../components/screens/app/account-screen";

export function AccountPage() {
  return (
    <>
      <Head>
        <title>Account | Kytelink</title>
        <meta name="robots" content="noindex" />
      </Head>
      <AccountScreen />
    </>
  );
}

export default AccountPage;
