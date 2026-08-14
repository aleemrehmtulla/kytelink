import { AccountScreen } from "../components/screens/app/account-screen";
import { PageHead } from "../components/seo/page-head";

export function AccountPage() {
  return (
    <>
      <PageHead title="Account | Kytelink" noindex />
      <AccountScreen />
    </>
  );
}

export default AccountPage;
