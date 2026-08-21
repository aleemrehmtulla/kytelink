import type { GetStaticProps } from "next";
import { NextSeo } from "next-seo";
import { PageShell } from "../components/layout/page-shell";
import { Hero } from "../components/home/hero";
import { UseCaseGrid } from "../components/home/feature-grid";
import { DeepFeatures } from "../components/home/deep-features";
import { OpenSourceBand } from "../components/home/open-source-band";
import { SoftwareApplicationJsonLd } from "../components/seo/json-ld";
import { HOME_TITLE, HOME_DESCRIPTION } from "../consts/site";
import { buildPageSeo } from "../lib/seo/build-page-seo";
import { fetchGithubStars } from "../lib/github-stars";

interface HomeProps {
  stars: number;
}

export function Home({ stars }: HomeProps) {
  return (
    <>
      <NextSeo
        {...buildPageSeo({
          path: "/",
          title: HOME_TITLE,
          description: HOME_DESCRIPTION,
        })}
      />
      <SoftwareApplicationJsonLd />
      <PageShell>
        <Hero />
        <UseCaseGrid />
        <DeepFeatures />
        <OpenSourceBand stars={stars} />
      </PageShell>
    </>
  );
}

export default Home;

export const getStaticProps: GetStaticProps<HomeProps> = async () => {
  const stars = await fetchGithubStars();
  return { props: { stars }, revalidate: 3600 };
};
