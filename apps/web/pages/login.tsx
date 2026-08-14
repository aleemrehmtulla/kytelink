import { PageHead } from "../components/seo/page-head";
import { AuthScreen } from "../components/screens/auth/auth-screen";

export function LoginPage() {
  return (
    <>
      <PageHead
        title="Log in | Kytelink"
        description="Log in to Kytelink to edit your kyte, links, and analytics."
        canonicalPath="/login"
      />
      <AuthScreen mode="login" />
    </>
  );
}

export default LoginPage;
