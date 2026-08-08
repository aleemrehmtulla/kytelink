import Head from "next/head";
import { useRouter } from "next/router";
import { EditorApp } from "../../components/screens/editor/editor-app";
import { isEditorTab } from "../../components/screens/editor/tabs";

export function EditorTabPage() {
  const router = useRouter();
  const raw = typeof router.query.tab === "string" ? router.query.tab : "links";
  const tab = isEditorTab(raw) ? raw : "links";

  return (
    <>
      <Head>
        <title>Editor | Kytelink</title>
        <meta name="robots" content="noindex" />
      </Head>
      <EditorApp tab={tab} />
    </>
  );
}

export default EditorTabPage;
