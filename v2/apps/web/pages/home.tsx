import Head from "next/head";
import { HomeScreen } from "../components/screens/app/home-screen";

export function HomePage() {
  return (
    <>
      <Head>
        <title>Home | Kytelink</title>
        <meta name="robots" content="noindex" />
      </Head>
      <HomeScreen />
    </>
  );
}

export default HomePage;
