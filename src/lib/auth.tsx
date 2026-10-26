"use client";

import { createContext, useContext, useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { api } from "./api";
import type { CurrentUser, LoginResponse } from "./apiTypes";
import { clearSession, getSession, saveSession } from "./session";
import { useApiResource } from "./useApi";
import { ApiErrorBanner } from "@/components/ui";

const UserContext = createContext<CurrentUser | null>(null);

export async function login(email: string, password: string): Promise<void> {
  const { accessToken, expiresAt, user } = await api.post<LoginResponse>("/auth/login", { email, password });
  saveSession({ accessToken, expiresAt, user });
}

export function logout(): void {
  clearSession();
}

export function useCurrentUser(): CurrentUser {
  const user = useContext(UserContext);
  if (!user) throw new Error("useCurrentUser must be used inside <AuthGuard>");
  return user;
}

const noop = () => () => {};

function Me({ children }: { children: React.ReactNode }) {
  const { data, error, reload } = useApiResource(() => api.getOne<CurrentUser>("/auth/me"), []);
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F3EC] p-6">
        <div className="w-full max-w-md"><ApiErrorBanner error={error} onRetry={reload} /></div>
      </div>
    );
  }
  if (!data) return <div className="min-h-screen bg-[#F7F3EC]" />;
  return <UserContext.Provider value={data}>{children}</UserContext.Provider>;
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  // false on the server/hydration pass so the session (sessionStorage) is only read on the client
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  const hasSession = mounted && getSession() !== null;
  useEffect(() => {
    if (mounted && !hasSession) router.replace("/login");
  }, [mounted, hasSession, router]);
  return hasSession ? <Me>{children}</Me> : null;
}
