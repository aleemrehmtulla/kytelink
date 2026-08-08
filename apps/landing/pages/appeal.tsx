import { NextSeo } from "next-seo";
import { useRouter } from "next/router";
import { APPEAL_KINDS, type AppealKind } from "@kytelink/schemas";
import { PageShell } from "../components/layout/page-shell";
import { Container } from "../components/ui/container";
import { AppealForm } from "../components/appeal/appeal-form";
import { buildPageSeo } from "../lib/seo/build-page-seo";

function asKind(value: unknown): AppealKind {
  return typeof value === "string" && (APPEAL_KINDS as readonly string[]).includes(value)
    ? (value as AppealKind)
    : "kyte";
}

export function AppealPage() {
  // Every suspension notice links here with the scope (and usually the handle)
  // already known. The query is empty until the router is ready, so the form is
  // keyed on it: it remounts once with the prefill instead of being written to.
  const router = useRouter();
  const kind = asKind(router.query.kind);
  const handle = typeof router.query.handle === "string" ? router.query.handle.slice(0, 200) : "";

  return (
    <>
      <NextSeo
        {...buildPageSeo({
          path: "/appeal",
          title: "Appeal a suspension",
          description:
            "Appeal a suspended Kytelink page, organization, or account. A person reads every appeal, and mistakes get fixed fast.",
        })}
        noindex
      />
      <PageShell>
        {/* Fills the first screen exactly (header is h-16 plus its hairline), so
            the footer begins at the fold rather than floating mid-page. */}
        <Container className="flex min-h-[calc(100svh-4rem-1px)] flex-col items-center justify-center gap-8 py-10">
          <div className="max-w-lg text-center">
            <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              Think we got it wrong?
            </h1>
            <p className="mt-3 text-secondary">
              Tell us what was suspended and why it shouldn&apos;t have been. A person reads every
              appeal, and nothing is deleted while we look.
            </p>
          </div>
          <div className="w-full max-w-md">
            <AppealForm key={`${kind}:${handle}`} initialKind={kind} initialHandle={handle} />
          </div>
        </Container>
      </PageShell>
    </>
  );
}

export default AppealPage;
