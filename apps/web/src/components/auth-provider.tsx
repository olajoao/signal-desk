"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import type { User, Org } from "@/lib/auth";
import { getMe, refreshAccessToken, logoutApi } from "@/lib/auth";

// Refresh 2 minutes before the 15-minute JWT expires
const REFRESH_INTERVAL_MS = 13 * 60 * 1000;

interface AuthState {
  user: User | null;
  org: Org | null;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  setAuth: (user: User, org: Org) => void;
  logout: () => void;
  refreshAuth: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const PUBLIC_PATHS = ["/", "/login", "/signup", "/forgot-password", "/reset-password", "/invite/accept"];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    org: null,
    isLoading: true,
  });
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Cookies are sent automatically — just check if session is valid
    getMe()
      .then(({ user, org }) => {
        if (user && org) {
          setState({ user, org, isLoading: false });
        } else {
          setState({ user: null, org: null, isLoading: false });
          if (!PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
            router.push("/login");
          }
        }
      })
      .catch(async () => {
        // Try refresh via cookie
        try {
          await refreshAccessToken();
          const { user, org } = await getMe();
          if (user && org) {
            setState({ user, org, isLoading: false });
            return;
          }
        } catch {
          // Refresh also failed
        }

        setState({ user: null, org: null, isLoading: false });
        if (!PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
          router.push("/login");
        }
      });
  }, [pathname, router]);

  // Proactive session refresh — keeps JWT alive while tab is open
  const refreshTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!state.user) {
      if (refreshTimer.current) clearInterval(refreshTimer.current);
      return;
    }

    refreshTimer.current = setInterval(async () => {
      try {
        await refreshAccessToken();
      } catch {
        setState({ user: null, org: null, isLoading: false });
        router.push("/login");
      }
    }, REFRESH_INTERVAL_MS);

    return () => {
      if (refreshTimer.current) clearInterval(refreshTimer.current);
    };
  }, [state.user, router]);

  const setAuth = (user: User, org: Org) => {
    setState({ user, org, isLoading: false });
  };

  const refreshAuth = async (): Promise<boolean> => {
    try {
      await refreshAccessToken();
      return true;
    } catch {
      return false;
    }
  };

  const logout = () => {
    logoutApi();
    setState({ user: null, org: null, isLoading: false });
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ ...state, setAuth, logout, refreshAuth }}>
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
