import Head from "next/head";
import { ErrorPage } from "@kytelink/ui";

export function NotFound() {
  return (
    <>
      <Head>
        <title>Not found — Kytelink admin</title>
      </Head>
      <ErrorPage
        className="min-h-[70vh]"
        code="404"
        title="Nothing here"
        description="That admin screen doesn't exist. Check the address, or head back to the overview."
        actionHref="/overview"
        actionLabel="Back to overview"
      />
    </>
  );
}

export default NotFound;
