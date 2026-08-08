import Head from "next/head";
import { LiveScreen } from "../components/screens/live/live-screen";

export function Live() {
  return (
    <>
      <Head>
        <title>Live — Kytelink admin</title>
      </Head>
      <LiveScreen />
    </>
  );
}

export default Live;
