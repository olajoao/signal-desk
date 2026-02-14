"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Sidebar, MobileNav } from "./sidebar";
import { useAuth } from "./auth-provider";

const PUBLIC_PATHS = ["/", "/login", "/signup", "/forgot-password", "/reset-password", "/invite/accept"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const isPublicPage = PUBLIC_PATHS.includes(pathname);
  const isLandingPage = pathname === "/";

  // Close mobile nav on route change
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  // Redirect authenticated users from landing to dashboard
  useEffect(() => {
    if (!isLoading && user && isLandingPage) {
      router.push("/dashboard");
    }
  }, [isLoading, user, isLandingPage, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  // Landing page for unauthenticated users
  if (isLandingPage && !user) {
    return <>{children}</>;
  }

  // Auth pages (login/signup)
  if (isPublicPage) {
    return <>{children}</>;
  }

  if (!user) {
    return null; // Auth provider handles redirect
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <MobileNav open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="md:hidden flex items-center gap-3 p-4 border-b border-[var(--border)] bg-[var(--card)]">
          <button
            onClick={() => setMobileNavOpen(true)}
            className="text-gray-400 hover:text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="font-semibold">SignalDesk</span>
        </header>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
