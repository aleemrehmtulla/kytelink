import { ErrorPage } from "@kytelink/ui";
import { PageHead } from "../components/seo/page-head";

export function ServerError() {
  return (
    <>
      <PageHead title="Something broke | Kytelink" noindex />
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
