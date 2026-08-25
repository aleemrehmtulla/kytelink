import Head from "next/head";
import { NewKytesScreen } from "../../components/screens/orgs/new-kytes-screen";

export function NewKytes() {
  return (
    <>
      <Head>
        <title>New kytes — Kytelink admin</title>
      </Head>
      <NewKytesScreen />
    </>
  );
}

export default NewKytes;
