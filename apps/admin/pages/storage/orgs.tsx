import Head from "next/head";
import { StorageOrgsScreen } from "../../components/screens/storage/storage-orgs-screen";

export function StorageOrgs() {
  return (
    <>
      <Head>
        <title>Storage by org — Kytelink admin</title>
      </Head>
      <StorageOrgsScreen />
    </>
  );
}

export default StorageOrgs;
