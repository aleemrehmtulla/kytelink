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
import { appCodeOfError } from "../api/errors";
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
  conflicted: boolean;
  resolvingConflict: boolean;
  resolveConflict: (choice: "latest" | "mine") => Promise<void>;
  publish: () => Promise<void>;
  revertToPublished: () => Promise<void>;
  refresh: () => Promise<void>;
}

const EditorContext = createContext<EditorContextValue | null>(null);

// Key-order-insensitive: server content round-trips through jsonb + zod, so
// identical drafts can stringify differently than locally-built ones.
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((item, index) => deepEqual(item, b[index]));
  }
  if (a === null || b === null || typeof a !== "object" || typeof b !== "object") return false;
  const left = a as Record<string, unknown>;
  const right = b as Record<string, unknown>;
  const keys = Object.keys(left);
  if (keys.length !== Object.keys(right).length) return false;
  return keys.every((key) => key in right && deepEqual(left[key], right[key]));
}

function equalContent(a: ProfileContent, b: ProfileContent | null): boolean {
  return b !== null && deepEqual(a, b);
}

type PersistOutcome = "saved" | "conflict" | "error";

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
  const [conflict, setConflict] = useState<KyteGet | null>(null);
  const [resolvingConflict, setResolvingConflict] = useState(false);
  const baseUpdatedAt = useRef<string>(initialKyte.updatedAt);
  const savedDraft = useRef<ProfileContent>(initialKyte.draft);
  const debounceRef = useRef<number | null>(null);
  const persistChain = useRef<Promise<unknown>>(Promise.resolve());

  const dirty = !equalContent(draft, kyte.publishedContent);
  const saveState: SaveState = publishing ? "saving" : dirty ? "dirty" : "saved";

  const persistNow = useCallback(
    async (content: ProfileContent): Promise<PersistOutcome> => {
      for (let attempt = 0; ; attempt++) {
        try {
          const result = await api.kyte.updateDraft({
            kyteId: kyte.id,
            content,
            baseUpdatedAt: baseUpdatedAt.current,
          });
          baseUpdatedAt.current = result.updatedAt;
          savedDraft.current = content;
          setConflict(null);
          return "saved";
        } catch (error) {
          if (appCodeOfError(error) === "STALE_DRAFT") {
            try {
              const fresh = await api.kyte.get({ kyteId: kyte.id });
              if (equalContent(content, fresh.draft)) {
                baseUpdatedAt.current = fresh.updatedAt;
                savedDraft.current = content;
                setKyte(fresh);
                setConflict(null);
                return "saved";
              }
              // Metadata-only mutations (username change, moderation) bump the
              // kyte row's updatedAt without touching the draft. If the server
              // draft is still the one this session last saved, nothing was
              // overwritten — adopt the new base and retry the save once.
              if (attempt === 0 && equalContent(savedDraft.current, fresh.draft)) {
                baseUpdatedAt.current = fresh.updatedAt;
                setKyte(fresh);
                continue;
              }
              setConflict(fresh);
              return "conflict";
            } catch {
              // Couldn't inspect the server draft — fall through to the plain toast.
            }
          }
          handleError(error, "Couldn't save your changes");
          return "error";
        }
      }
    },
    [api, kyte.id, handleError],
  );

  // Saves are strictly serialized: a save dispatched while another is in
  // flight would carry a stale baseUpdatedAt and read back as a phantom
  // conflict against the user's own preceding keystrokes.
  const persist = useCallback(
    (content: ProfileContent): Promise<PersistOutcome> => {
      const next = persistChain.current.then(() => persistNow(content));
      persistChain.current = next;
      return next;
    },
    [persistNow],
  );

  useEffect(() => {
    if (conflict) return;
    if (equalContent(draft, savedDraft.current)) return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => void persist(draft), 200);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [draft, persist, conflict]);

  const resolveConflict = useCallback(
    async (choice: "latest" | "mine") => {
      if (!conflict || resolvingConflict) return;
      if (choice === "latest") {
        if (debounceRef.current) window.clearTimeout(debounceRef.current);
        baseUpdatedAt.current = conflict.updatedAt;
        savedDraft.current = conflict.draft;
        setKyte(conflict);
        setDraftState(conflict.draft);
        setConflict(null);
        toast("Loaded the latest version", "success");
        return;
      }
      setResolvingConflict(true);
      try {
        baseUpdatedAt.current = conflict.updatedAt;
        if ((await persist(draft)) === "saved") toast("Saved your version", "success");
      } finally {
        setResolvingConflict(false);
      }
    },
    [conflict, resolvingConflict, draft, persist, toast],
  );

  useEffect(() => {
    if (!conflict) return;
    const warn = (event: BeforeUnloadEvent) => {
      if (equalContent(draft, savedDraft.current)) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [conflict, draft]);

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
      const saved = await persist(draft);
      if (saved === "conflict") {
        toast("This draft changed somewhere else — settle that first", "error");
        return;
      }
      if (saved !== "saved") return;
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
    if ((await persist(published)) === "saved") toast("Draft reverted to what's live", "success");
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
      conflicted: conflict !== null,
      resolvingConflict,
      resolveConflict,
      publish,
      revertToPublished,
      refresh,
    }),
    [orgs, kyte, allows, draft, patchDraft, setDraft, saveState, dirty, conflict, resolvingConflict, resolveConflict, publish, revertToPublished, refresh],
  );

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}

export function useEditor(): EditorContextValue {
  const context = useContext(EditorContext);
  if (!context) throw new Error("useEditor must be used within EditorProvider");
  return context;
}
