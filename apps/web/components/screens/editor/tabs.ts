export const EDITOR_TABS = ["links", "design", "analytics", "settings"] as const;
export type EditorTab = (typeof EDITOR_TABS)[number];

export const TAB_LABELS: Record<EditorTab, string> = {
  links: "Links",
  design: "Design",
  analytics: "Analytics",
  settings: "Settings",
};

export function isEditorTab(value: string): value is EditorTab {
  return (EDITOR_TABS as readonly string[]).includes(value);
}
