import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { AuthResponseDTO, UserDTO, UserRole } from "@dmis/shared";
import { ApiClientError, apiRequest, setUnauthorizedHandler } from "../lib/api";
import { clearToken, getToken, setToken } from "./tokenStore";

type Status = "loading" | "authenticated" | "unauthenticated" | "error";

interface AuthState {
  status: Status;
  user: UserDTO | null;
  error: ApiClientError | null;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  /** Re-attempt session restoration after a network/server failure. */
  retry: () => void;
  /** UX gating only — the API enforces roles server-side. */
  hasRole: (...roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const UNAUTH: AuthState = { status: "unauthenticated", user: null, error: null };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() => (getToken() ? { status: "loading", user: null, error: null } : UNAUTH));

  const restore = useCallback(async () => {
    if (!getToken()) {
      setState(UNAUTH);
      return;
    }
    setState({ status: "loading", user: null, error: null });
    try {
      const { data } = await apiRequest<UserDTO>("/auth/me");
      setState({ status: "authenticated", user: data, error: null });
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 401) {
        clearToken();
        setState(UNAUTH);
      } else {
        // Network/server trouble is NOT a logout — keep the token and offer a retry.
        const error =
          err instanceof ApiClientError ? err : new ApiClientError("network", 0, "NETWORK", "Can't reach the server. Please try again in a moment.");
        setState({ status: "error", user: null, error });
      }
    }
  }, []);

  useEffect(() => {
    void restore();
  }, [restore]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearToken();
      setState(UNAUTH);
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await apiRequest<AuthResponseDTO>("/auth/login", { body: { email, password }, auth: false });
    setToken(data.token);
    setState({ status: "authenticated", user: data.user, error: null });
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setState(UNAUTH);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      login,
      logout,
      retry: () => void restore(),
      hasRole: (...roles) => !!state.user && roles.includes(state.user.role),
    }),
    [state, login, logout, restore]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
