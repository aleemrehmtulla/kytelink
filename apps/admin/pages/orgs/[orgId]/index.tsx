import Head from "next/head";
import { useRouter } from "next/router";
import { OrgDetailScreen } from "../../../components/screens/orgs/org-detail-screen";

export function OrgDetail() {
  const router = useRouter();
  const orgId = typeof router.query.orgId === "string" ? router.query.orgId : undefined;

  return (
    <>
      <Head>
        <title>Org — Kytelink admin</title>
      </Head>
      {orgId ? <OrgDetailScreen key={orgId} orgId={orgId} /> : null}
    </>
  );
}

export default OrgDetail;
