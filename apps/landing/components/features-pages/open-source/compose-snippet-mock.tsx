import Link from "next/link";

const COMMANDS = [
  "git clone <this repo> && cd kytelink/v2",
  "pnpm install",
  "pnpm run setup",
  "pnpm dev",
];

export function ComposeSnippetMock() {
  return (
    <div className="rounded-card border border-cardline bg-card p-5 sm:p-6">
      <h3 className="text-[13px] font-semibold text-ink">Self-host in three commands</h3>
      <div className="mt-4 rounded-menu border border-dark-border bg-dark-card p-5 font-mono text-[13px] leading-loose">
        <div className="mb-3 flex gap-1.5" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-pill bg-dark-dot" />
          <span className="h-2.5 w-2.5 rounded-pill bg-dark-dot" />
          <span className="h-2.5 w-2.5 rounded-pill bg-dark-dot" />
        </div>
        {COMMANDS.map((command) => (
          <div key={command} className="text-dark-text">
            <span className="text-dark-muted">$</span> {command}
          </div>
        ))}
        <div className="text-accent-on-dark">→ live at localhost:3000 🪁</div>
      </div>
      <Link
        href="/self-hosting"
        className="mt-4 inline-block text-sm font-medium text-accent outline-none transition-colors hover:text-accent-hover"
      >
        Read the full self-hosting guide →
      </Link>
    </div>
  );
}
