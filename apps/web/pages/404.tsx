import { useEffect, useState } from "react";
import { validateUsername } from "@kytelink/schemas";
import { ErrorPage } from "@kytelink/ui";
import { PageHead } from "../components/seo/page-head";

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
      <PageHead title="Not found | Kytelink" noindex />
      <main className="min-h-dvh bg-canvas">
        <ErrorPage
          className="min-h-dvh"
          code="404"
          title="Nothing here"
          description={
            claimable ? (
              <>
                If no one has claimed{" "}
                <span className="font-medium text-ink">kytelink.com/{attempted}</span> yet, it can
                be yours.
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
