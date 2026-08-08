import Head from "next/head";
import { useRouter } from "next/router";
import { KyteDetailScreen } from "../../../components/screens/orgs/kyte-detail-screen";

export function KyteDetail() {
  const router = useRouter();
  const kyteId = typeof router.query.kyteId === "string" ? router.query.kyteId : undefined;

  return (
    <>
      <Head>
        <title>Kyte — Kytelink admin</title>
      </Head>
      {kyteId ? <KyteDetailScreen key={kyteId} kyteId={kyteId} /> : null}
    </>
  );
}

export default KyteDetail;
