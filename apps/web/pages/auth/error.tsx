import Link from "next/link";
import { PageHead } from "../../components/seo/page-head";

export function AuthErrorPage() {
  return (
    <>
      <PageHead title="Sign-in problem | Kytelink" noindex />
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-canvas px-6 text-center">
        <div className="text-4xl" aria-hidden>🪁</div>
        <h1 className="text-[32px] font-bold tracking-[-0.025em] text-ink">We couldn&apos;t sign you in</h1>
        <p className="text-[15px] text-secondary">The link may have expired. No harm done — try again.</p>
        <Link
          href="/login"
          className="mt-1 inline-flex h-11 items-center rounded-pill bg-accent px-6 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
        >
          Back to login
        </Link>
      </main>
    </>
  );
}

export default AuthErrorPage;
