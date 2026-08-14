import type { GetStaticProps, InferGetStaticPropsType } from "next";
import { DirectoryView } from "../../components/discover/directory-view";
import { discoverPageProps, type DiscoverPageProps } from "../../lib/discover";

export const getStaticProps: GetStaticProps<DiscoverPageProps> = () => discoverPageProps(1);

function DiscoverPage(props: InferGetStaticPropsType<typeof getStaticProps>) {
  return <DirectoryView {...props} />;
}

DiscoverPage.bare = true;

export default DiscoverPage;
