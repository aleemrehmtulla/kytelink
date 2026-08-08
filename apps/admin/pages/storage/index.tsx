import Head from "next/head";
import { StorageOverviewScreen } from "../../components/screens/storage/storage-overview-screen";

export function Storage() {
  return (
    <>
      <Head>
        <title>Storage — Kytelink admin</title>
      </Head>
      <StorageOverviewScreen />
    </>
  );
}

export default Storage;
