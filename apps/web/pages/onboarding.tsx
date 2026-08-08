import Head from "next/head";
import { OnboardingWizard } from "../components/screens/onboarding/onboarding-wizard";

export function OnboardingPage() {
  return (
    <>
      <Head>
        <title>Set up your Kytelink</title>
        <meta name="robots" content="noindex" />
      </Head>
      <OnboardingWizard />
    </>
  );
}

export default OnboardingPage;
