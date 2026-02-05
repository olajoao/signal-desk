"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Sidebar } from "./sidebar";
import { useAuth } from "./auth-provider";

const PUBLIC_PATHS = ["/", "/login", "/signup"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { token, isLoading } = useAuth();

  const isPublicPage = PUBLIC_PATHS.includes(pathname);
  const isLandingPage = pathname === "/";

  // Redirect authenticated users from landing to dashboard
  useEffect(() => {
    if (!isLoading && token && isLandingPage) {
      router.push("/dashboard");
    }
  }, [isLoading, token, isLandingPage, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  // Landing page for unauthenticated users
  if (isLandingPage && !token) {
    return <>{children}</>;
  }

  // Auth pages (login/signup)
  if (isPublicPage) {
    return <>{children}</>;
  }

  // Protected pages - redirect to login if no token
  if (!token) {
    return null; // Auth provider handles redirect
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}
