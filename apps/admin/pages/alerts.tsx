import Head from "next/head";
import { AlertsScreen } from "../components/screens/alerts/alerts-screen";

export function Alerts() {
  return (
    <>
      <Head>
        <title>Alerts — Kytelink admin</title>
      </Head>
      <AlertsScreen />
    </>
  );
}

export default Alerts;
