import Head from "next/head";
import { ErrorPage } from "@kytelink/ui";

export function ServerError() {
  return (
    <>
      <Head>
        <title>Something broke | Kytelink</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <main className="min-h-dvh bg-canvas">
        <ErrorPage
          className="min-h-dvh"
          code="500"
          title="That's on us"
          description="Something broke on our end. Try again in a moment — your kyte and its data are untouched."
          actionHref="/"
          actionLabel="Go home"
        />
      </main>
    </>
  );
}

ServerError.bare = true;

export default ServerError;
