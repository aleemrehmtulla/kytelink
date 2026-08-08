import Head from "next/head";
import { InvitesScreen } from "../components/screens/app/invites-screen";

export function InvitesPage() {
  return (
    <>
      <Head>
        <title>Invites | Kytelink</title>
        <meta name="robots" content="noindex" />
      </Head>
      <InvitesScreen />
    </>
  );
}

export default InvitesPage;
