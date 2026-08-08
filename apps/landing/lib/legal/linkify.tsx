import Link from "next/link";
import type { ReactNode } from "react";
import { ALEEM_TWITTER_URL } from "../../consts/site";

const X_HANDLE = ALEEM_TWITTER_URL.split("/").pop() ?? "";

// A [label](href) marker wins first so its href is never re-tokenized, then
// email, so an address is never chopped into a bare @handle.
const TOKEN =
  /\[([^\]]+)\]\(([^)]+)\)|([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})|kytelink\.com(\/[A-Za-z0-9-]+)|@([A-Za-z0-9_]+)/g;

const LINK_CLASS =
  "cursor-pointer text-accent underline decoration-accent-border underline-offset-2 outline-none transition-colors hover:decoration-accent";

// Legal copy is authored as plain prose, so the addresses inside it are turned
// into links here rather than by hand-marking every occurrence in the source.
export function linkify(text: string): ReactNode {
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let key = 0;

  for (const match of text.matchAll(TOKEN)) {
    const [raw, label, href, email, path, handle] = match;
    const start = match.index ?? 0;
    if (start > cursor) nodes.push(text.slice(cursor, start));
    cursor = start + raw.length;

    if (label && href) {
      nodes.push(
        href.startsWith("/") ? (
          <Link key={key++} href={href} className={LINK_CLASS}>
            {label}
          </Link>
        ) : (
          <a key={key++} href={href} target="_blank" rel="noreferrer" className={LINK_CLASS}>
            {label}
          </a>
        ),
      );
    } else if (email) {
      nodes.push(
        <a key={key++} href={`mailto:${email}`} className={LINK_CLASS}>
          {email}
        </a>,
      );
    } else if (path) {
      nodes.push(
        <Link key={key++} href={path} className={LINK_CLASS}>
          {raw}
        </Link>,
      );
    } else if (handle && handle === X_HANDLE) {
      nodes.push(
        <a
          key={key++}
          href={ALEEM_TWITTER_URL}
          target="_blank"
          rel="noreferrer"
          className={LINK_CLASS}
        >
          {raw}
        </a>,
      );
    } else {
      // An unrecognised handle stays plain text rather than guessing a profile.
      nodes.push(raw);
    }
  }

  if (nodes.length === 0) return text;
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
}
