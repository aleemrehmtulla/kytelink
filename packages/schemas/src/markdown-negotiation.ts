export const MARKDOWN_CONTENT_TYPE = "text/markdown; charset=utf-8";

function qualityOf(params: string[]): number {
  for (const param of params) {
    const [key, value] = param.split("=").map((part) => part.trim());
    if (key === "q") {
      const q = Number(value);
      return Number.isFinite(q) ? Math.min(Math.max(q, 0), 1) : 1;
    }
  }
  return 1;
}

export function prefersMarkdown(acceptHeader: string | null | undefined): boolean {
  if (!acceptHeader) return false;
  let markdown = 0;
  let html = 0;
  for (const entry of acceptHeader.split(",")) {
    const [type, ...params] = entry.split(";");
    const mediaType = type?.trim().toLowerCase();
    if (mediaType === "text/markdown") markdown = Math.max(markdown, qualityOf(params));
    else if (mediaType === "text/html") html = Math.max(html, qualityOf(params));
  }
  return markdown > 0 && markdown >= html;
}
