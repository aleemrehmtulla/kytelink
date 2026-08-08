import type { GetStaticPaths, GetStaticProps, InferGetStaticPropsType } from "next";
import { getCdnUrl } from "@kytelink/cdn";
import { prefixHttps, type ProfileContent } from "@kytelink/schemas";
import { PublicProfile } from "../components/profile/public-profile";
import { BlockedShell } from "../components/profile/blocked-shell";
import { ProfileHead } from "../components/seo/profile-head";
import { fetchPublishedProfile } from "../lib/api/profile-fetch";
import { appealUrl } from "../consts/appeal";

type PageProps =
  | { kind: "blocked"; reason: string | null; appealHref: string }
  | {
      kind: "profile";
      username: string;
      kyteId: string | null;
      content: ProfileContent;
      ogImageUrl: string | null;
      avatarUrl: string | null;
    };

export const getStaticPaths: GetStaticPaths = () => {
  return { paths: [], fallback: "blocking" };
};

export const getStaticProps: GetStaticProps<PageProps> = async (context) => {
  const raw = context.params?.username;
  const username = (Array.isArray(raw) ? raw[0] : raw)?.toLowerCase();
  if (!username) return { notFound: true };

  const result = await fetchPublishedProfile(username);
  if (result.status === "NOT_FOUND" || !result.content) {
    return { notFound: true };
  }

  if (result.content.shouldRedirect && result.content.redirectUrl) {
    return {
      redirect: { destination: prefixHttps(result.content.redirectUrl), permanent: false },
    };
  }

  if (result.status === "SUSPENDED") {
    return {
      props: {
        kind: "blocked",
        reason: result.suspensionReason,
        appealHref: appealUrl("kyte", username),
      },
    };
  }

  const avatarUrl = result.content.avatar?.url ? getCdnUrl(result.content.avatar.url) : null;

  return {
    props: {
      kind: "profile",
      username,
      kyteId: result.kyteId,
      content: result.content,
      ogImageUrl: result.ogImageUrl,
      avatarUrl,
    },
  };
};

function ProfilePage(props: InferGetStaticPropsType<typeof getStaticProps>) {
  if (props.kind === "blocked") {
    return <BlockedShell reason={props.reason} appealHref={props.appealHref} />;
  }
  return (
    <>
      <ProfileHead
        username={props.username}
        content={props.content}
        ogImageUrl={props.ogImageUrl}
        avatarPreloadUrl={props.avatarUrl}
      />
      <PublicProfile content={props.content} username={props.username} kyteId={props.kyteId} />
    </>
  );
}

ProfilePage.bare = true;

export default ProfilePage;
