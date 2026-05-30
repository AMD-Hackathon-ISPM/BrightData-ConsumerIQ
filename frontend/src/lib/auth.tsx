import {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useState,
    type ReactNode,
} from "react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useFounderPipelineStore } from "@/features/onboarding/founder-form/session-store";

const STORAGE_KEY = "consumer-iq-auth";
const TOKEN_KEY = "consumer-iq-token";
const CONSUMER_IQ_ONBOARDED_KEY = "consumeriq:onboarded";
const SESSION_CACHE_KEYS = [
    "ciq_persona_data",
    "ciq_persona_task_id",
    "ciq_demand_pulse_data",
    "ciq_insights_data",
] as const;

export interface AuthUser {
    fullName: string;
    email: string;
}

export interface LoginInput {
    email: string;
    password: string;
}

export interface RegisterInput {
    fullName: string;
    email: string;
    password: string;
    confirmPassword: string;
}

export interface AuthContextValue {
    user: AuthUser | null;
    login: (input: LoginInput) => Promise<{ ok: boolean; error?: string }>;
    register: (
        input: RegisterInput,
    ) => Promise<{ ok: boolean; error?: string }>;
    logout: () => void;
    clearLocalSession: () => void;
    loginWithToken: (user: AuthUser, token: string) => void;
}

export function getAuthToken(): string | null {
    try {
        return typeof window !== "undefined"
            ? localStorage.getItem(TOKEN_KEY)
            : null;
    } catch {
        return null;
    }
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredUser(): AuthUser | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as AuthUser;
        if (
            typeof parsed?.email !== "string" ||
            typeof parsed?.fullName !== "string"
        ) {
            return null;
        }
        return parsed;
    } catch {
        return null;
    }
}

function persistUser(user: AuthUser | null, token?: string) {
    if (typeof window === "undefined") return;
    if (user) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
        if (token) localStorage.setItem(TOKEN_KEY, token);
    } else {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(TOKEN_KEY);
    }
}

function clearSessionCache() {
    if (typeof window === "undefined") return;
    for (const key of SESSION_CACHE_KEYS) {
        localStorage.removeItem(key);
    }
    localStorage.removeItem(CONSUMER_IQ_ONBOARDED_KEY);
}

function clearUserScopedState(queryClient: QueryClient) {
    clearSessionCache();
    useFounderPipelineStore.getState().resetAll();
    queryClient.clear();
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const queryClient = useQueryClient();
    const [user, setUser] = useState<AuthUser | null>(() => readStoredUser());

    const setAuthenticatedUser = useCallback(
        (next: AuthUser, token: string) => {
            if (user?.email !== next.email) {
                clearUserScopedState(queryClient);
            }
            setUser(next);
            persistUser(next, token);
        },
        [queryClient, user?.email],
    );

    const loginWithToken = useCallback((next: AuthUser, token: string) => {
        setAuthenticatedUser(next, token);
    }, [setAuthenticatedUser]);

    const login = useCallback(async ({ email, password }: LoginInput) => {
        const normalizedEmail = email.trim().toLowerCase();
        if (!normalizedEmail || !password) {
            return { ok: false, error: "Email and password are required" };
        }
        try {
            const res = await fetch("/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: normalizedEmail, password }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                return {
                    ok: false,
                    error:
                        (data as { error?: string }).error ??
                        "Invalid credentials",
                };
            }
            const { token } = (await res.json()) as { token: string };
            const next: AuthUser = {
                fullName: normalizedEmail.split("@")[0] || "User",
                email: normalizedEmail,
            };
            setAuthenticatedUser(next, token);
            return { ok: true };
        } catch {
            return { ok: false, error: "Network error" };
        }
    }, [setAuthenticatedUser]);

    const register = useCallback(
        async ({ fullName, email, password, confirmPassword }: RegisterInput) => {
            const normalizedEmail = email.trim().toLowerCase();
            if (!fullName.trim() || !normalizedEmail || !password) {
                return { ok: false, error: "All fields are required" };
            }
            if (password !== confirmPassword) {
                return { ok: false, error: "Passwords do not match" };
            }
            try {
                const res = await fetch("/auth/register", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: normalizedEmail, password }),
                });
                if (!res.ok) {
                    const data = await res.json().catch(() => ({}));
                    return {
                        ok: false,
                        error:
                            (data as { error?: string }).error ??
                            "Could not create account",
                    };
                }
                const { token } = (await res.json()) as { token: string };
                const next: AuthUser = { fullName: fullName.trim(), email: normalizedEmail };
                setAuthenticatedUser(next, token);
                return { ok: true };
            } catch {
                return { ok: false, error: "Network error" };
            }
        },
        [setAuthenticatedUser],
    );

    const logout = useCallback(() => {
        const token = getAuthToken();
        if (token) {
            fetch("/auth/logout", {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
            }).catch(() => {});
        }
        setUser(null);
        persistUser(null);
        clearUserScopedState(queryClient);
    }, [queryClient]);

    const clearLocalSession = useCallback(() => {
        setUser(null);
        persistUser(null);
        clearUserScopedState(queryClient);
    }, [queryClient]);

    const value = useMemo<AuthContextValue>(
        () => ({
            user,
            login,
            register,
            logout,
            clearLocalSession,
            loginWithToken,
        }),
        [user, login, register, logout, clearLocalSession, loginWithToken],
    );

    return (
        <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
    );
}

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        throw new Error("useAuth must be used inside <AuthProvider>");
    }
    return ctx;
}
