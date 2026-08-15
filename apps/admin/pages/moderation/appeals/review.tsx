import Head from "next/head";
import { AppealReviewScreen } from "../../../components/screens/moderation/appeal-review-screen";

export function AppealReview() {
  return (
    <>
      <Head>
        <title>Appeal review — Kytelink admin</title>
      </Head>
      <AppealReviewScreen />
    </>
  );
}

export default AppealReview;
