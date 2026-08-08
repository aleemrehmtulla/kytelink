import Head from "next/head";
import { UsersListScreen } from "../../components/screens/users/users-list-screen";

export function Users() {
  return (
    <>
      <Head>
        <title>Users — Kytelink admin</title>
      </Head>
      <UsersListScreen />
    </>
  );
}

export default Users;
