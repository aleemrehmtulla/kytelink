import Head from "next/head";
import { AuditScreen } from "../components/screens/audit/audit-screen";

export function Audit() {
  return (
    <>
      <Head>
        <title>Audit log — Kytelink admin</title>
      </Head>
      <AuditScreen />
    </>
  );
}

export default Audit;
