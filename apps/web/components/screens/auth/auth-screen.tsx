import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { AnimatePresence, motion, useAnimationControls, useReducedMotion } from "framer-motion";
import { authMorphMotion } from "@kytelink/ui";
import { FaGithub, FaGoogle } from "react-icons/fa";
import { ArrowRight, KeyRound, Zap } from "lucide-react";
import { useApp } from "../../../lib/app-context";
import {
  AGENT_EMAIL,
  completeOtp,
  completePasskeySignIn,
  devLogin,
  sendOtp,
  startProviderSignIn,
} from "../../../lib/auth/auth";
import { isMockApi } from "../../../lib/api/client";
import { isAgentMode } from "../../../lib/env";
import { Button } from "../../ui/button";
import { TextInput } from "../../ui/text-input";
import { OtpInput } from "../../ui/otp-input";
import { ShowcasePanel } from "./showcase-panel";
import { LANDING_ORIGIN } from "../../../consts/landing-routes";

const EMAIL_RE = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/;

export interface AuthScreenProps {
  mode: "login" | "signup";
}

export function AuthScreen({ mode }: AuthScreenProps) {
  const router = useRouter();
  const { applySignIn, toast } = useApp();
  const capabilities = useApp().capabilities;
  const [step, setStep] = useState<"form" | "otp">("form");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [passkeyError, setPasskeyError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const emailShake = useAnimationControls();
  const reduceMotion = useReducedMotion();

  const emailValid = EMAIL_RE.test(email);
  const isLogin = mode === "login";

  function routeAfter(needsOnboarding: boolean) {
    void router.push(needsOnboarding ? "/onboarding" : "/edit");
  }

  function rejectEmail() {
    setEmailError(true);
    if (reduceMotion) return;
    void emailShake.start({
      x: [0, -6, 6, -5, 5, -3, 3, 0],
      transition: { duration: 0.4, ease: "easeInOut" },
    });
  }

  async function onEmailContinue() {
    if (!emailValid) {
      rejectEmail();
      return;
    }
    setBusy(true);
    try {
      await sendOtp(email);
      setStep("otp");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Couldn't send a code", "error");
    } finally {
      setBusy(false);
    }
  }

  async function onVerify(code: string) {
    if (busy) return;
    setBusy(true);
    try {
      const result = await completeOtp(email, code);
      applySignIn(result);
      routeAfter(result.needsOnboarding);
    } catch (error) {
      toast(error instanceof Error ? error.message : "That code isn't right", "error");
      setBusy(false);
    }
  }

  async function onProvider(provider: "google" | "github") {
    try {
      const callbackURL = `${window.location.origin}/edit`;
      const result = await startProviderSignIn(provider, callbackURL);
      if (result) {
        applySignIn(result);
        routeAfter(result.needsOnboarding);
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : "Sign-in failed", "error");
    }
  }

  async function onPasskey() {
    setPasskeyError(null);
    const result = await completePasskeySignIn();
    if (!result) {
      setPasskeyError("No passkey found on this device — use Google, GitHub, or email instead.");
      return;
    }
    applySignIn(result);
    routeAfter(result.needsOnboarding);
  }

  // Conditional UI: when the browser advertises conditional mediation and we're on the
  // login screen, arm passkey autofill on the email field. It silently no-ops if the
  // platform can't (unsupported, mock mode, or the user picks another method).
  useEffect(() => {
    if (!isLogin || step !== "form" || isMockApi()) return;
    let cancelled = false;
    const supports = (
      window.PublicKeyCredential as unknown as {
        isConditionalMediationAvailable?: () => Promise<boolean>;
      }
    )?.isConditionalMediationAvailable;
    if (typeof supports !== "function") return;
    void supports().then((available) => {
      if (!available || cancelled) return;
      void completePasskeySignIn({ autoFill: true }).then((result) => {
        if (!result || cancelled) return;
        applySignIn(result);
        routeAfter(result.needsOnboarding);
      });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLogin, step]);

  async function onAgentDevLogin() {
    setBusy(true);
    try {
      const result = await devLogin(AGENT_EMAIL);
      applySignIn(result);
      routeAfter(result.needsOnboarding);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Dev login failed", "error");
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <Link href={LANDING_ORIGIN} className="mb-8 inline-flex items-center" aria-label="Kytelink">
            <span className="text-3xl">🪁</span>
          </Link>

          <AnimatePresence mode="wait">
            {step === "form" ? (
              <motion.div
                key={`form-${mode}`}
                variants={authMorphMotion}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <h1 className="text-[28px] font-bold tracking-[-0.025em] text-ink">
                  {isLogin ? "Welcome back" : "Create your Kytelink"}
                </h1>
                <p className="mt-1.5 text-sm text-secondary">
                  {isLogin ? "Don't have an account? " : "Already have an account? "}
                  <Link
                    href={isLogin ? "/signup" : "/login"}
                    className="font-medium text-accent hover:text-accent-hover"
                  >
                    {isLogin ? "Create one" : "Log in"}
                  </Link>
                </p>

                <div className="mt-6 flex flex-col gap-3">
                  {capabilities.oauthGoogle ? (
                    <Button variant="secondary" block onClick={() => void onProvider("google")}>
                      <FaGoogle /> Continue with Google
                    </Button>
                  ) : null}
                  {capabilities.oauthGithub ? (
                    <Button variant="secondary" block onClick={() => void onProvider("github")}>
                      <FaGithub /> Continue with GitHub
                    </Button>
                  ) : null}
                  {isLogin ? (
                    <Button variant="secondary" block onClick={() => void onPasskey()}>
                      <KeyRound /> Sign in with a passkey
                    </Button>
                  ) : null}
                  {passkeyError ? (
                    <p className="text-xs text-danger">{passkeyError}</p>
                  ) : null}
                  {isAgentMode() && !isMockApi() ? (
                    <Button variant="ghost" block loading={busy} onClick={() => void onAgentDevLogin()}>
                      <Zap /> Agent quick sign-in ({AGENT_EMAIL})
                    </Button>
                  ) : null}
                </div>

                <div className="my-6 flex items-center gap-3 text-xs text-faint">
                  <span className="h-px flex-1 bg-hairline" /> or <span className="h-px flex-1 bg-hairline" />
                </div>

                <div className="flex flex-col gap-3">
                  <motion.div animate={emailShake}>
                    <TextInput
                      type="email"
                      inputMode="email"
                      autoComplete={isLogin ? "username webauthn" : "username"}
                      placeholder="nikola.tesla@example.com"
                      value={email}
                      onChange={(event) => {
                        setEmail(event.target.value);
                        if (emailError) setEmailError(false);
                      }}
                      onKeyDown={(event) => event.key === "Enter" && void onEmailContinue()}
                      status={emailError ? "invalid" : emailValid ? "valid" : "default"}
                      error={
                        emailError
                          ? email.length === 0
                            ? "Enter your email address"
                            : "That doesn't look like a valid email"
                          : null
                      }
                    />
                  </motion.div>
                  <Button variant="accent" block loading={busy} onClick={() => void onEmailContinue()}>
                    Continue <ArrowRight />
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="otp"
                variants={authMorphMotion}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <h1 className="text-[28px] font-bold tracking-[-0.025em] text-ink">Check your inbox</h1>
                <p className="mt-1.5 text-sm text-secondary">
                  We sent a 6-digit code to <span className="font-medium text-ink">{email}</span>.{" "}
                  <button
                    type="button"
                    className="font-medium text-accent hover:text-accent-hover"
                    onClick={() => setStep("form")}
                  >
                    Edit
                  </button>
                </p>
                <div className="mt-6">
                  <OtpInput value={otp} onChange={setOtp} onComplete={(code) => void onVerify(code)} disabled={busy} />
                </div>
                {isMockApi() ? (
                  <p className="mt-3 text-xs text-faint">Mock mode: any 6 digits work.</p>
                ) : null}
                <Button variant="accent" className="mt-4" block loading={busy} onClick={() => void onVerify(otp)}>
                  Verify
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="mt-8 text-xs text-faint">
            By continuing you agree to Kytelink&apos;s{" "}
            <a href={`${LANDING_ORIGIN}/terms-of-service`} className="text-tertiary underline hover:text-ink">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href={`${LANDING_ORIGIN}/privacy-policy`} className="text-tertiary underline hover:text-ink">
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </div>
      <ShowcasePanel />
    </div>
  );
}
