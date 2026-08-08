import Head from "next/head";
import { ModerationAppealsScreen } from "../../components/screens/moderation/moderation-appeals-screen";

export function ModerationAppeals() {
  return (
    <>
      <Head>
        <title>Appeals — Kytelink admin</title>
      </Head>
      <ModerationAppealsScreen />
    </>
  );
}

export default ModerationAppeals;
