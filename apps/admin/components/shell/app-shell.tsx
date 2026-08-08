import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/router";
import type { Capabilities } from "@kytelink/schemas";
import type { AdminMe } from "../../lib/admin-source";
import { AdminMeContext, AdminSourceProvider } from "../admin-source-provider";
import { ToastProvider } from "../ui/toast";
import { useAsync } from "../../hooks/use-async";
import { createRealAdminSource } from "../../lib/real-admin-source";
import { getAdminTrpcClient } from "../../lib/trpc-client";
import { fetchJson } from "../../lib/fetch-json";
import { isUnauthorizedError } from "../../lib/errors";
import { BootErrorScreen, BootLoadingScreen } from "./boot-screen";
import { CommandPalette } from "./command-palette";
import { ImpersonationBar } from "./impersonation-bar";
import { ImpersonationProvider } from "./impersonation-context";
import { MobileNav } from "./mobile-nav";
import { SideNav } from "./side-nav";
import { TopBar } from "./top-bar";
import { UnauthorizedScreen } from "./unauthorized-screen";

export interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const fetchCapabilities = useCallback(
    () => fetchJson<Capabilities>("/api/capabilities"),
    [],
  );
  const capabilities = useAsync(fetchCapabilities);

  // Identity doesn't depend on capabilities, so it must not wait behind them:
  // gating the provider on capabilities and only then asking who's signed in
  // made first paint three serial round trips instead of two.
  const bootSource = useMemo(() => createRealAdminSource(getAdminTrpcClient()), []);
  const fetchMe = useCallback(() => bootSource.me(), [bootSource]);
  const me = useAsync(fetchMe);

  // Boot paints the real chrome, not a centred spinner: the nav and top bar
  // are identical before and after the session resolves, so the first frame
  // is already in its final position.
  if (capabilities.status === "loading" || me.status === "loading") {
    return <BootLoadingScreen />;
  }

  if (me.status === "error") {
    if (isUnauthorizedError(me.error)) return <UnauthorizedScreen />;
    return (
      <BootErrorScreen
        title="Couldn't reach the API"
        description="Your admin session couldn't be confirmed because the API didn't answer. Nothing has changed."
        onRetry={me.reload}
      />
    );
  }

  if (!me.data) return <UnauthorizedScreen />;

  if (capabilities.status === "error" || !capabilities.data) {
    return (
      <BootErrorScreen
        title="Couldn't load this deployment's settings"
        description="The admin app asks its own server which optional services are configured. That request failed."
        onRetry={capabilities.reload}
      />
    );
  }

  return (
    <AdminSourceProvider capabilities={capabilities.data}>
      <ToastProvider>
        <ImpersonationProvider>
          <ShellFrame me={me.data}>{children}</ShellFrame>
        </ImpersonationProvider>
      </ToastProvider>
    </AdminSourceProvider>
  );
}

function ShellFrame({ me, children }: { me: AdminMe; children: ReactNode }) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const paletteOpenRef = useRef(false);
  const openPalette = useCallback(() => setPaletteOpen(true), []);
  const closePalette = useCallback(() => setPaletteOpen(false), []);

  useEffect(() => {
    paletteOpenRef.current = paletteOpen;
  }, [paletteOpen]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "k") return;
      if (paletteOpenRef.current) {
        event.preventDefault();
        setPaletteOpen(false);
        return;
      }
      // Another dialog owns the keyboard — don't steal ⌘K from an input inside it.
      if (document.querySelector('[role="dialog"]')) return;
      event.preventDefault();
      setPaletteOpen(true);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const scrollRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  useEffect(() => {
    function onRouteChange(_url: string, options: { shallow?: boolean }) {
      if (!options.shallow) scrollRef.current?.scrollTo(0, 0);
    }
    router.events.on("routeChangeComplete", onRouteChange);
    return () => router.events.off("routeChangeComplete", onRouteChange);
  }, [router.events]);

  return (
    <AdminMeContext.Provider value={me}>
      <div className="bg-canvas text-ink flex h-dvh flex-col overflow-hidden">
        <ImpersonationBar />
        <div className="flex min-h-0 flex-1">
          <SideNav />
          <div
            ref={scrollRef}
            className="stable-gutter flex min-w-0 flex-1 flex-col overflow-y-auto overscroll-y-none"
          >
            <TopBar onOpenPalette={openPalette} />
            <MobileNav />
            <main className="flex-1 px-4 py-5 md:px-8 md:py-7">
              <div className="mx-auto w-full max-w-[1400px]">{children}</div>
            </main>
          </div>
        </div>
      </div>
      {paletteOpen ? <CommandPalette onClose={closePalette} /> : null}
    </AdminMeContext.Provider>
  );
}
