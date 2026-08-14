import type { GetStaticPaths, GetStaticProps, InferGetStaticPropsType } from "next";
import { DirectoryView } from "../../components/discover/directory-view";
import { discoverPageProps, type DiscoverPageProps } from "../../lib/discover";

export const getStaticPaths: GetStaticPaths = () => {
  return { paths: [], fallback: "blocking" };
};

export const getStaticProps: GetStaticProps<DiscoverPageProps> = async (context) => {
  const raw = context.params?.page;
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value || !/^[1-9]\d*$/.test(value)) return { notFound: true };
  // Collapse /discover/1 into /discover so the first page has exactly one URL.
  if (value === "1") return { redirect: { destination: "/discover", permanent: true } };
  return discoverPageProps(Number.parseInt(value, 10));
};

function DiscoverPagedPage(props: InferGetStaticPropsType<typeof getStaticProps>) {
  return <DirectoryView {...props} />;
}

DiscoverPagedPage.bare = true;

export default DiscoverPagedPage;
