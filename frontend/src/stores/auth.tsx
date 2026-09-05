import { createContext, useCallback, useContext, useMemo, useState } from "react";

import { login, logout, restoreSession } from "../api/client";
import type { User } from "../types/auth";

type AuthState = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  restore: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const signIn = useCallback(async (email: string, password: string) => {
    await login(email, password);
    setUser(await restoreSession());
    setLoading(false);
  }, []);

  const restore = useCallback(async () => {
    try {
      setUser(await restoreSession());
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    await logout();
    setUser(null);
    setLoading(false);
  }, []);

  const value = useMemo(() => ({ user, loading, signIn, restore, signOut }), [user, loading, signIn, restore, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthStore(): AuthState {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuthStore must be used inside AuthProvider");
  return value;
}

