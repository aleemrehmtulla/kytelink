import Head from "next/head";
import { useRouter } from "next/router";
import { StorageOrgScreen } from "../../components/screens/storage/storage-org-screen";

export function StorageOrg() {
  const router = useRouter();
  const orgId = typeof router.query.orgId === "string" ? router.query.orgId : undefined;

  return (
    <>
      <Head>
        <title>Org storage — Kytelink admin</title>
      </Head>
      {orgId ? <StorageOrgScreen orgId={orgId} /> : null}
    </>
  );
}

export default StorageOrg;
