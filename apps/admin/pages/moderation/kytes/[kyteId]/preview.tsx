import Head from "next/head";
import { useRouter } from "next/router";
import { KytePreviewScreen } from "../../../../components/screens/moderation/kyte-preview-screen";

export function KytePreview() {
  const router = useRouter();
  const kyteId = typeof router.query.kyteId === "string" ? router.query.kyteId : undefined;

  return (
    <>
      <Head>
        <title>Page as published — Kytelink admin</title>
      </Head>
      {kyteId ? <KytePreviewScreen key={kyteId} kyteId={kyteId} /> : null}
    </>
  );
}

export default KytePreview;
