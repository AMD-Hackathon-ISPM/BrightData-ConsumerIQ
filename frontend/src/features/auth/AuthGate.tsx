import { useEffect, useState } from "react";

import { AuthLayout } from "@/components/layouts/AuthLayout";
import { Login } from "@/features/auth/Login";
import { Register } from "@/features/auth/Register";

type Mode = "login" | "register";

export function AuthGate() {
    const [mode, setMode] = useState<Mode>("login");

    useEffect(() => {
        document.title =
            mode === "login" ? "Sign In · ConsumerIQ" : "Sign Up · ConsumerIQ";
    }, [mode]);

    return (
        <AuthLayout>
            {mode === "login" ? (
                <Login onSwitchToRegister={() => setMode("register")} />
            ) : (
                <Register onSwitchToLogin={() => setMode("login")} />
            )}
        </AuthLayout>
    );
}
