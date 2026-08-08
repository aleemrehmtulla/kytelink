import Head from "next/head";
import { GrowthScreen } from "../components/screens/growth/growth-screen";

export function Growth() {
  return (
    <>
      <Head>
        <title>Growth — Kytelink admin</title>
      </Head>
      <GrowthScreen />
    </>
  );
}

export default Growth;
