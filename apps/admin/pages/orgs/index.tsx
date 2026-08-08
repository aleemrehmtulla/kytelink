import Head from "next/head";
import { OrgsListScreen } from "../../components/screens/orgs/orgs-list-screen";

export function Orgs() {
  return (
    <>
      <Head>
        <title>Orgs & kytes — Kytelink admin</title>
      </Head>
      <OrgsListScreen />
    </>
  );
}

export default Orgs;
