import { NextSeo } from "next-seo";
import { ErrorPage } from "@kytelink/ui";
import { PageShell } from "../components/layout/page-shell";

export function NotFoundPage() {
  return (
    <>
      <NextSeo title="Page not found" noindex />
      <PageShell>
        {/* Fills the first screen (header is h-16 plus its hairline) so the
            footer begins at the fold rather than floating mid-page. */}
        <ErrorPage
          className="min-h-[calc(100svh-4rem-1px)]"
          code="404"
          title="Page not found"
          description="That page drifted off. Let's get you back on the ground."
          actionHref="/"
          actionLabel="Back home"
        />
      </PageShell>
    </>
  );
}

export default NotFoundPage;
