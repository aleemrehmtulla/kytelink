import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ErrorPage } from "./error-page";

describe("ErrorPage", () => {
  it("renders the code, title, description, and action", () => {
    const html = renderToStaticMarkup(
      <ErrorPage
        code="404"
        title="Nothing here"
        description="That page flew off somewhere."
        actionHref="/signup"
        actionLabel="Create your Kytelink"
      />,
    );
    expect(html).toContain("Error 404");
    expect(html).toContain("Nothing here");
    expect(html).toContain("That page flew off somewhere.");
    expect(html).toContain('href="/signup"');
    expect(html).toContain("Create your Kytelink");
  });

  it("renders exactly one h1 and no main, so zone shells keep their landmarks", () => {
    const html = renderToStaticMarkup(
      <ErrorPage
        code="500"
        title="That's on us"
        description="Something broke."
        actionHref="/"
        actionLabel="Go home"
      />,
    );
    expect(html.match(/<h1/g)).toHaveLength(1);
    expect(html).not.toContain("<main");
  });

  it("accepts rich description and footer nodes", () => {
    const html = renderToStaticMarkup(
      <ErrorPage
        code="404"
        title="Nothing here"
        description={
          <>
            But <span className="font-medium text-ink">kytelink.com/aleem</span> is up for grabs.
          </>
        }
        actionHref="/signup?username=aleem"
        actionLabel="Claim it"
        footer={<a href="/">Back home</a>}
      />,
    );
    expect(html).toContain("kytelink.com/aleem");
    expect(html).toContain('href="/signup?username=aleem"');
    expect(html).toContain("Back home");
  });

  it("applies the per-zone height class", () => {
    const html = renderToStaticMarkup(
      <ErrorPage
        className="min-h-[70vh]"
        code="404"
        title="t"
        description="d"
        actionHref="/"
        actionLabel="a"
      />,
    );
    expect(html).toContain("min-h-[70vh]");
  });
});
