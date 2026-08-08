import { useEffect } from "react";
import { useRouter } from "next/router";
import { useApp } from "../../lib/app-context";
import { Spinner } from "../../components/ui/spinner";

export function EditRedirectPage() {
  const router = useRouter();
  const { ready, session } = useApp();

  useEffect(() => {
    if (!ready) return;
    if (!session) {
      void router.replace("/login");
      return;
    }
    void router.replace("/edit/links");
  }, [ready, session, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Spinner size={28} />
    </div>
  );
}

export default EditRedirectPage;
