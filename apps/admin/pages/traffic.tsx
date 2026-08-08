import Head from "next/head";
import { TrafficScreen } from "../components/screens/traffic/traffic-screen";

export function Traffic() {
  return (
    <>
      <Head>
        <title>Traffic — Kytelink admin</title>
      </Head>
      <TrafficScreen />
    </>
  );
}

export default Traffic;
