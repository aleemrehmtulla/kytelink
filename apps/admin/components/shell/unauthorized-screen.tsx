import { WEB_LOGIN_URL } from "../../lib/urls";

export function UnauthorizedScreen() {
  return (
    <div className="bg-canvas text-ink flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
      <span className="text-3xl" aria-hidden="true">
        🪁
      </span>
      <h1 className="text-lg font-semibold">Admin access required</h1>
      <p className="text-secondary max-w-sm text-[13px] leading-relaxed">
        You&rsquo;re either signed out or signed in with an account that isn&rsquo;t a
        platform admin. Sign in with an admin account to continue.
      </p>
      <a
        href={WEB_LOGIN_URL}
        className="rounded-pill bg-accent text-accent-fg hover:bg-accent-hover mt-2 cursor-pointer px-4 py-2 text-[14px] font-medium"
      >
        Log in
      </a>
      <p className="text-faint max-w-sm text-[12px] leading-relaxed">
        Admin access is granted by the platform admin — no account can grant it to itself.
      </p>
    </div>
  );
}
