import { NextSeo } from "next-seo";
import { ErrorPage } from "@kytelink/ui";
import { PageShell } from "../components/layout/page-shell";

export function ServerErrorPage() {
  return (
    <>
      <NextSeo title="Something broke" noindex />
      <PageShell>
        <ErrorPage
          className="min-h-[calc(100svh-4rem-1px)]"
          code="500"
          title="That's on us"
          description="Something broke on our end. Try again in a moment."
          actionHref="/"
          actionLabel="Back home"
        />
      </PageShell>
    </>
  );
}

export default ServerErrorPage;
