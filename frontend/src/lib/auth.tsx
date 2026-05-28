import {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useState,
    type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";

const STORAGE_KEY = "consumer-iq-auth";
const TOKEN_KEY = "consumer-iq-token";
const SESSION_CACHE_KEYS = [
    "ciq_persona_data",
    "ciq_persona_task_id",
    "ciq_demand_pulse_data",
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
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const queryClient = useQueryClient();
    const [user, setUser] = useState<AuthUser | null>(() => readStoredUser());

    const setAuthenticatedUser = useCallback(
        (next: AuthUser, token: string) => {
            if (user?.email !== next.email) {
                clearSessionCache();
                queryClient.clear();
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
        if (!email.trim() || !password) {
            return { ok: false, error: "Email and password are required" };
        }
        try {
            const res = await fetch("/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
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
                fullName: email.split("@")[0] || "User",
                email,
            };
            setAuthenticatedUser(next, token);
            return { ok: true };
        } catch {
            return { ok: false, error: "Network error" };
        }
    }, [setAuthenticatedUser]);

    const register = useCallback(
        async ({ fullName, email, password, confirmPassword }: RegisterInput) => {
            if (!fullName.trim() || !email.trim() || !password) {
                return { ok: false, error: "All fields are required" };
            }
            if (password !== confirmPassword) {
                return { ok: false, error: "Passwords do not match" };
            }
            try {
                const res = await fetch("/auth/register", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, password }),
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
                const next: AuthUser = { fullName, email };
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
        clearSessionCache();
        queryClient.clear();
    }, [queryClient]);

    const value = useMemo<AuthContextValue>(
        () => ({ user, login, register, logout, loginWithToken }),
        [user, login, register, logout, loginWithToken],
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
