import Head from "next/head";
import { StorageOrphansScreen } from "../../components/screens/storage/storage-orphans-screen";

export function StorageOrphans() {
  return (
    <>
      <Head>
        <title>Orphaned files — Kytelink admin</title>
      </Head>
      <StorageOrphansScreen />
    </>
  );
}

export default StorageOrphans;
