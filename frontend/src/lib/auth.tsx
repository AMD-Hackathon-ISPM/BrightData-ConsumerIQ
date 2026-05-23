import {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useState,
    type ReactNode,
} from "react";

const STORAGE_KEY = "consumer-iq-auth";

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
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredUser(): AuthUser | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
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

function persist(user: AuthUser | null) {
    if (typeof window === "undefined") return;
    if (user) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
        window.localStorage.removeItem(STORAGE_KEY);
    }
}

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<AuthUser | null>(() => readStoredUser());

    const login = useCallback(
        async ({ email, password }: LoginInput) => {
            if (!email.trim() || !password) {
                return { ok: false, error: "Email and password are required" };
            }
            const next: AuthUser = {
                fullName: email.split("@")[0] || "User",
                email,
            };
            setUser(next);
            persist(next);
            return { ok: true };
        },
        [],
    );

    const register = useCallback(
        async ({ fullName, email, password, confirmPassword }: RegisterInput) => {
            if (!fullName.trim() || !email.trim() || !password) {
                return { ok: false, error: "All fields are required" };
            }
            if (password !== confirmPassword) {
                return { ok: false, error: "Passwords do not match" };
            }
            const next: AuthUser = { fullName, email };
            setUser(next);
            persist(next);
            return { ok: true };
        },
        [],
    );

    const logout = useCallback(() => {
        setUser(null);
        persist(null);
    }, []);

    const value = useMemo<AuthContextValue>(
        () => ({ user, login, register, logout }),
        [user, login, register, logout],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        throw new Error("useAuth must be used inside <AuthProvider>");
    }
    return ctx;
}
