import Head from "next/head";
import { useEffect, useState } from "react";
import { validateUsername } from "@kytelink/schemas";
import { ErrorPage } from "@kytelink/ui";

export function NotFound() {
  // /404 is prerendered, so the real path is only knowable on the client.
  // Reading it during render would make every 404 a hydration mismatch.
  const [attempted, setAttempted] = useState("");

  useEffect(() => {
    setAttempted(window.location.pathname.replace(/^\//, "").split("?")[0] ?? "");
  }, []);

  // Only offer the handle if it would actually survive a claim — reserved
  // names like /404 or /support are valid-looking but can never be taken.
  const claimable = validateUsername(attempted).ok;

  return (
    <>
      <Head>
        <title>Not found | Kytelink</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <main className="min-h-dvh bg-canvas">
        <ErrorPage
          className="min-h-dvh"
          code="404"
          title="Nothing here"
          description={
            claimable ? (
              <>
                But <span className="font-medium text-ink">kytelink.com/{attempted}</span> is up for
                grabs.
              </>
            ) : (
              "That page flew off somewhere."
            )
          }
          actionHref={claimable ? `/signup?username=${encodeURIComponent(attempted)}` : "/signup"}
          actionLabel={claimable ? "Claim it" : "Create your Kytelink"}
        />
      </main>
    </>
  );
}

NotFound.bare = true;

export default NotFound;
