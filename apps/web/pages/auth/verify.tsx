import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useApp } from "../../lib/app-context";
import { completeOtp } from "../../lib/auth/auth";
import { OtpInput } from "../../components/ui/otp-input";
import { Button } from "../../components/ui/button";
import { Spinner } from "../../components/ui/spinner";
import { PageHead } from "../../components/seo/page-head";

export function VerifyPage() {
  const router = useRouter();
  const { applySignIn, toast } = useApp();
  const [otp, setOtp] = useState("");
  const [email, setEmail] = useState("");
  const [signingIn, setSigningIn] = useState(false);

  function verify(code: string, address: string) {
    if (signingIn) return;
    if (code.length !== 6 || !address) {
      toast("Enter the 6-digit code", "error");
      return;
    }
    setSigningIn(true);
    completeOtp(address, code)
      .then((result) => {
        applySignIn(result);
        void router.push(result.needsOnboarding ? "/onboarding" : "/edit");
      })
      .catch((error: unknown) => {
        toast(error instanceof Error ? error.message : "That code isn't right", "error");
        setSigningIn(false);
      });
  }

  useEffect(() => {
    if (!router.isReady) return;
    const queryEmail = typeof router.query.email === "string" ? router.query.email : "";
    const queryOtp = typeof router.query.otp === "string" ? router.query.otp : "";
    setEmail(queryEmail);
    if (queryOtp) {
      setOtp(queryOtp);
      verify(queryOtp, queryEmail);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady]);

  return (
    <>
      <PageHead title="Verify your code | Kytelink" noindex />
      <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-canvas px-6">
        {signingIn ? (
          <div className="flex flex-col items-center gap-3 text-secondary">
            <Spinner size={28} />
            <p className="text-sm">Signing you in…</p>
          </div>
        ) : (
          <div className="w-full max-w-sm text-center">
            <div className="text-4xl" aria-hidden>🪁</div>
            <h1 className="mt-3 text-[28px] font-bold tracking-[-0.025em] text-ink">Enter your code</h1>
            <p className="mt-1.5 text-sm text-secondary">
              {email ? `Sent to ${email}` : "Check your email for a 6-digit code."}
            </p>
            <div className="mt-6 flex justify-center">
              <OtpInput value={otp} onChange={setOtp} onComplete={(code) => verify(code, email)} />
            </div>
            <Button variant="accent" className="mt-4" block onClick={() => verify(otp, email)}>
              Verify
            </Button>
          </div>
        )}
      </main>
    </>
  );
}

export default VerifyPage;
