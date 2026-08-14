import { PageHead } from "../components/seo/page-head";
import { AuthScreen } from "../components/screens/auth/auth-screen";

export function SignupPage() {
  return (
    <>
      <PageHead
        title="Create your Kytelink"
        description="Claim your handle and build a free, open-source link-in-bio page in under a minute."
        canonicalPath="/signup"
      />
      <AuthScreen mode="signup" />
    </>
  );
}

export default SignupPage;
