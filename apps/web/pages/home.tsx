import { HomeScreen } from "../components/screens/app/home-screen";
import { PageHead } from "../components/seo/page-head";

export function HomePage() {
  return (
    <>
      <PageHead title="Home | Kytelink" noindex />
      <HomeScreen />
    </>
  );
}

export default HomePage;
