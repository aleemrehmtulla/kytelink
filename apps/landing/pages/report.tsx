import { NextSeo } from "next-seo";
import { PageShell } from "../components/layout/page-shell";
import { Container } from "../components/ui/container";
import { ReportForm } from "../components/report/report-form";
import { buildPageSeo } from "../lib/seo/build-page-seo";

export function ReportPage() {
  return (
    <>
      <NextSeo
        {...buildPageSeo({
          path: "/report",
          title: "Report abuse",
          description: "Report a Kytelink profile that's impersonating someone, running a scam, or breaking the rules.",
        })}
        noindex
      />
      <PageShell>
        {/* Fills the first screen exactly (header is h-16 plus its hairline), so
            the footer begins at the fold rather than floating mid-page. */}
        <Container className="flex min-h-[calc(100svh-4rem-1px)] flex-col items-center justify-center gap-8 py-10">
          <div className="max-w-lg text-center">
            <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              Seen a Kytelink impersonating a company or running a scam?
            </h1>
            <p className="mt-3 text-secondary">
              Tell us where, and why. We review every report.
            </p>
          </div>
          <div className="w-full max-w-md">
            <ReportForm />
          </div>
        </Container>
      </PageShell>
    </>
  );
}

export default ReportPage;
