import Head from "next/head";
import { useRouter } from "next/router";
import { UserDetailScreen } from "../../components/screens/users/user-detail-screen";

export function UserDetail() {
  const router = useRouter();
  const userId = typeof router.query.userId === "string" ? router.query.userId : undefined;

  return (
    <>
      <Head>
        <title>User — Kytelink admin</title>
      </Head>
      {userId ? <UserDetailScreen userId={userId} /> : null}
    </>
  );
}

export default UserDetail;
