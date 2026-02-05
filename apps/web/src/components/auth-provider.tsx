"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import type { User, Org } from "@/lib/auth";
import { getMe, refreshAccessToken, logoutApi } from "@/lib/auth";

interface AuthState {
  token: string | null;
  user: User | null;
  org: Org | null;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  setAuth: (accessToken: string, refreshToken: string, user: User, org: Org) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const PUBLIC_PATHS = ["/", "/login", "/signup", "/forgot-password", "/reset-password", "/invite/accept"];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    token: null,
    user: null,
    org: null,
    isLoading: true,
  });
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const accessToken = localStorage.getItem("token");
    const rt = localStorage.getItem("refreshToken");

    if (!accessToken) {
      setState((s) => ({ ...s, isLoading: false }));
      if (!PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
        router.push("/login");
      }
      return;
    }

    getMe(accessToken)
      .then(({ user, org }) => {
        setState({ token: accessToken, user, org, isLoading: false });
      })
      .catch(async () => {
        // Try refresh
        if (rt) {
          try {
            const refreshed = await refreshAccessToken(rt);
            localStorage.setItem("token", refreshed.accessToken);
            localStorage.setItem("refreshToken", refreshed.refreshToken);
            const { user, org } = await getMe(refreshed.accessToken);
            setState({ token: refreshed.accessToken, user, org, isLoading: false });
            return;
          } catch {
            // Refresh also failed
          }
        }

        localStorage.removeItem("token");
        localStorage.removeItem("refreshToken");
        setState({ token: null, user: null, org: null, isLoading: false });
        if (!PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
          router.push("/login");
        }
      });
  }, [pathname, router]);

  const setAuth = (accessToken: string, refreshToken: string, user: User, org: Org) => {
    localStorage.setItem("token", accessToken);
    localStorage.setItem("refreshToken", refreshToken);
    setState({ token: accessToken, user, org, isLoading: false });
  };

  const logout = () => {
    const rt = localStorage.getItem("refreshToken");
    if (rt) logoutApi(rt);
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    setState({ token: null, user: null, org: null, isLoading: false });
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ ...state, setAuth, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
