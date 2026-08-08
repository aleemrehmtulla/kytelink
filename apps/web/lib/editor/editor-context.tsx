import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { can, type Action, type ProfileContent, type Role } from "@kytelink/schemas";
import { useApp } from "../app-context";
import type { KyteGet, OrgSummary } from "../api/types";

export type SaveState = "idle" | "dirty" | "saving" | "saved";

export const SAVE_LABELS: Record<SaveState, string> = {
  idle: "Saved",
  dirty: "Unpublished changes",
  saving: "Publishing…",
  saved: "Published",
};

interface EditorContextValue {
  orgs: OrgSummary[];
  kyte: KyteGet;
  role: Role;
  allows: (action: Action) => boolean;
  draft: ProfileContent;
  patchDraft: (partial: Partial<ProfileContent>) => void;
  setDraft: (next: ProfileContent) => void;
  saveState: SaveState;
  dirty: boolean;
  publish: () => Promise<void>;
  revertToPublished: () => Promise<void>;
  refresh: () => Promise<void>;
}

const EditorContext = createContext<EditorContextValue | null>(null);

function equalContent(a: ProfileContent, b: ProfileContent | null): boolean {
  if (!b) return false;
  return JSON.stringify(a) === JSON.stringify(b);
}

export function EditorProvider({
  orgs,
  initialKyte,
  children,
}: {
  orgs: OrgSummary[];
  initialKyte: KyteGet;
  children: ReactNode;
}) {
  const { api, toast, handleError } = useApp();
  const [kyte, setKyte] = useState<KyteGet>(initialKyte);
  const [draft, setDraftState] = useState<ProfileContent>(initialKyte.draft);
  const [publishing, setPublishing] = useState(false);
  const baseUpdatedAt = useRef<string>(initialKyte.updatedAt);
  const savedDraft = useRef<ProfileContent>(initialKyte.draft);
  const debounceRef = useRef<number | null>(null);

  const dirty = !equalContent(draft, kyte.publishedContent);
  const saveState: SaveState = publishing ? "saving" : dirty ? "dirty" : "saved";

  const persist = useCallback(
    async (content: ProfileContent) => {
      try {
        const result = await api.kyte.updateDraft({
          kyteId: kyte.id,
          content,
          baseUpdatedAt: baseUpdatedAt.current,
        });
        baseUpdatedAt.current = result.updatedAt;
        savedDraft.current = content;
      } catch (error) {
        handleError(error, "Couldn't save your changes");
      }
    },
    [api, kyte.id, handleError],
  );

  useEffect(() => {
    if (JSON.stringify(draft) === JSON.stringify(savedDraft.current)) return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => void persist(draft), 200);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [draft, persist]);

  const patchDraft = useCallback((partial: Partial<ProfileContent>) => {
    setDraftState((current) => ({ ...current, ...partial }));
  }, []);

  const setDraft = useCallback((next: ProfileContent) => setDraftState(next), []);

  const refresh = useCallback(async () => {
    const fresh = await api.kyte.get({ kyteId: kyte.id });
    setKyte(fresh);
    baseUpdatedAt.current = fresh.updatedAt;
  }, [api, kyte.id]);

  const publish = useCallback(async () => {
    setPublishing(true);
    try {
      await persist(draft);
      await api.kyte.publish({ kyteId: kyte.id });
      setKyte((current) => ({ ...current, published: true, publishedContent: draft }));
      toast("Kyte published!", "success");
    } catch (error) {
      handleError(error, "Couldn't publish");
    } finally {
      setPublishing(false);
    }
  }, [api, draft, kyte.id, persist, toast, handleError]);

  const revertToPublished = useCallback(async () => {
    const published = kyte.publishedContent;
    if (!published) return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    // Pre-mark as saved so the debounce effect doesn't schedule a second,
    // redundant persist for the same content.
    savedDraft.current = published;
    setDraftState(published);
    await persist(published);
    toast("Draft reverted to what's live", "success");
  }, [kyte.publishedContent, persist, toast]);

  const allows = useCallback((action: Action) => can(kyte.role, action), [kyte.role]);

  const value = useMemo<EditorContextValue>(
    () => ({
      orgs,
      kyte,
      role: kyte.role,
      allows,
      draft,
      patchDraft,
      setDraft,
      saveState,
      dirty,
      publish,
      revertToPublished,
      refresh,
    }),
    [orgs, kyte, allows, draft, patchDraft, setDraft, saveState, dirty, publish, revertToPublished, refresh],
  );

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}

export function useEditor(): EditorContextValue {
  const context = useContext(EditorContext);
  if (!context) throw new Error("useEditor must be used within EditorProvider");
  return context;
}
