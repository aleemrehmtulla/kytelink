import Head from "next/head";
import { ErrorPage } from "@kytelink/ui";

export function ServerError() {
  return (
    <>
      <Head>
        <title>Something broke — Kytelink admin</title>
      </Head>
      <ErrorPage
        className="min-h-[70vh]"
        code="500"
        title="That's on us"
        description="Something broke on our end. Try again in a moment."
        actionHref="/overview"
        actionLabel="Back to overview"
      />
    </>
  );
}

export default ServerError;
