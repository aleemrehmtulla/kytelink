import Head from "next/head";
import { ReviewModeScreen } from "../../components/screens/moderation/review-mode-screen";

export function ModerationReview() {
  return (
    <>
      <Head>
        <title>Review mode — Kytelink admin</title>
      </Head>
      <ReviewModeScreen />
    </>
  );
}

export default ModerationReview;
