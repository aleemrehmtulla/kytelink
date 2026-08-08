import { useEffect, useRef, useState } from "react";
import Head from "next/head";
import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import type { IncomingMessage } from "node:http";
import { ProfileView } from "@kytelink/ui/profile-view";
import {
  PREVIEW_PASSCODE_PARAM,
  previewPasscodeSchema,
  type ProfileContent,
} from "@kytelink/schemas";
import { internalApiBase } from "../../lib/env";
import { internalSignedHeaders } from "../../lib/api/internal-hmac";
import { Lock } from "lucide-react";
import { OtpInput } from "../../components/ui/otp-input";
import { Button } from "../../components/ui/button";
import { ProfileHead } from "../../components/seo/profile-head";

type GateError = null | "wrong" | "throttled";

type PreviewProps =
  | { state: "gate"; error: GateError }
  | { state: "draft"; content: ProfileContent; username: string | null; fromQuery: boolean };

const GATE_ERRORS: Record<Exclude<GateError, null>, string> = {
  wrong: "Wrong or expired passcode. Try again.",
  throttled: "Too many tries. Wait a few minutes, then try again.",
};

function readRawBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => resolve(data));
    req.on("error", () => resolve(""));
  });
}

export const getServerSideProps: GetServerSideProps<PreviewProps> = async ({
  req,
  params,
  query,
}) => {
  const raw = params?.token;
  const token = Array.isArray(raw) ? raw[0] : raw;
  if (!token) return { notFound: true };

  // Two ways in: the owner's own link carries `?p=`, everyone else posts the
  // gate form. Neither present means show the gate, unasked and unerrored.
  const fromQuery = query[PREVIEW_PASSCODE_PARAM];
  const submitted =
    req.method === "POST"
      ? new URLSearchParams(await readRawBody(req)).get("passcode")
      : ((Array.isArray(fromQuery) ? fromQuery[0] : fromQuery) ?? null);
  if (submitted === null) {
    return { props: { state: "gate", error: null } };
  }

  const passcode = previewPasscodeSchema.safeParse(submitted);
  if (!passcode.success) {
    return { props: { state: "gate", error: "wrong" } };
  }

  const path = `/internal/previews/${token}`;
  const payload = JSON.stringify({ passcode: passcode.data });
  const headers = await internalSignedHeaders("POST", path, payload);
  const response = await fetch(`${internalApiBase()}${path}`, {
    method: "POST",
    headers: { ...headers, "content-type": "application/json" },
    body: payload,
  });

  if (!response.ok) {
    // The internal endpoint collapses wrong-passcode / expired into 403; 429 is
    // told apart so a throttled visitor isn't stuck retyping a correct passcode.
    return {
      props: { state: "gate", error: response.status === 429 ? "throttled" : "wrong" },
    };
  }
  const data = (await response.json()) as { content: ProfileContent; username: string | null };
  return {
    props: {
      state: "draft",
      content: data.content,
      username: data.username,
      fromQuery: req.method !== "POST",
    },
  };
};

function PasscodeGate({ error }: { error: GateError }) {
  const [passcode, setPasscode] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const hiddenRef = useRef<HTMLInputElement>(null);

  function submitWith(code: string) {
    if (hiddenRef.current) hiddenRef.current.value = code;
    formRef.current?.requestSubmit();
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background px-6 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
        <Lock className="size-5" />
      </div>
      <div>
        <h1 className="text-xl font-semibold text-foreground">This is a private draft</h1>
        <p className="mt-1 text-sm text-muted-foreground">Enter the 6-digit passcode to view it.</p>
      </div>
      <form ref={formRef} method="POST" className="flex flex-col items-center gap-4">
        <input ref={hiddenRef} type="hidden" name="passcode" value={passcode} readOnly />
        <OtpInput value={passcode} onChange={setPasscode} onComplete={submitWith} />
        {error ? <p className="text-sm text-danger">{GATE_ERRORS[error]}</p> : null}
        <Button type="submit" disabled={passcode.length !== 6}>
          View draft
        </Button>
      </form>
    </main>
  );
}

// A preview is the published page, minus the publishing: same renderer, same
// props, no chrome. The only differences are noindex and no analytics beacons.
function DraftView({ content, username }: { content: ProfileContent; username: string | null }) {
  return (
    <>
      {username ? (
        <ProfileHead username={username} content={content} ogImageUrl={null} noindex />
      ) : (
        <Head>
          <title>Draft preview</title>
          <meta name="robots" content="noindex, nofollow" />
        </Head>
      )}
      <div className="relative min-h-screen">
        <ProfileView content={content} username={username ?? undefined} />
      </div>
    </>
  );
}

function PreviewPage(props: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const fromQuery = props.state === "draft" && props.fromQuery;

  // Drop `?p=` once it has done its job: the passcode should not sit in the
  // address bar, nor ride out as a Referer when a profile link is clicked.
  useEffect(() => {
    if (!fromQuery) return;
    const url = new URL(window.location.href);
    if (!url.searchParams.has(PREVIEW_PASSCODE_PARAM)) return;
    url.searchParams.delete(PREVIEW_PASSCODE_PARAM);
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
  }, [fromQuery]);

  if (props.state === "draft") {
    return <DraftView content={props.content} username={props.username} />;
  }

  return (
    <>
      <Head>
        <title>Enter passcode | Kytelink</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <PasscodeGate error={props.error} />
    </>
  );
}

PreviewPage.bare = true;

export default PreviewPage;
