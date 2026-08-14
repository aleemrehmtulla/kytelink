import { useRouter } from "next/router";
import { OrgSettingsScreen } from "../../../components/screens/app/org-settings-screen";
import { AppShell } from "../../../components/screens/app/app-shell";
import { Spinner } from "../../../components/ui/spinner";
import { PageHead } from "../../../components/seo/page-head";

export function OrgSettingsPage() {
  const router = useRouter();
  const orgId = typeof router.query.orgId === "string" ? router.query.orgId : "";

  return (
    <>
      <PageHead title="Organization settings | Kytelink" noindex />
      {orgId ? (
        <OrgSettingsScreen orgId={orgId} />
      ) : (
        <AppShell>
          <div className="flex min-h-[50vh] items-center justify-center">
            <Spinner size={28} />
          </div>
        </AppShell>
      )}
    </>
  );
}

export default OrgSettingsPage;
