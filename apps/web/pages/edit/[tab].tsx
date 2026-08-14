import { useRouter } from "next/router";
import { EditorApp } from "../../components/screens/editor/editor-app";
import { isEditorTab } from "../../components/screens/editor/tabs";
import { PageHead } from "../../components/seo/page-head";

export function EditorTabPage() {
  const router = useRouter();
  const raw = typeof router.query.tab === "string" ? router.query.tab : "links";
  const tab = isEditorTab(raw) ? raw : "links";

  return (
    <>
      <PageHead title="Editor | Kytelink" noindex />
      <EditorApp tab={tab} />
    </>
  );
}

export default EditorTabPage;
