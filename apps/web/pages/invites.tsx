import { InvitesScreen } from "../components/screens/app/invites-screen";
import { PageHead } from "../components/seo/page-head";

export function InvitesPage() {
  return (
    <>
      <PageHead title="Invites | Kytelink" noindex />
      <InvitesScreen />
    </>
  );
}

export default InvitesPage;
