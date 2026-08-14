import { OnboardingWizard } from "../components/screens/onboarding/onboarding-wizard";
import { PageHead } from "../components/seo/page-head";

export function OnboardingPage() {
  return (
    <>
      <PageHead title="Set up your Kytelink" noindex />
      <OnboardingWizard />
    </>
  );
}

export default OnboardingPage;
