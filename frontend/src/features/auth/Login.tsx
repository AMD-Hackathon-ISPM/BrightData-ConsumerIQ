import { type FormEvent, useState } from "react";
import { IconEye, IconEyeOff } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
    Field,
    FieldDescription,
    FieldError,
    FieldGroup,
    FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";

interface LoginProps {
    onSwitchToRegister: () => void;
}

export function Login({ onSwitchToRegister }: LoginProps) {
    const { login, loginWithToken } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (processing) return;
        setError(null);
        setProcessing(true);
        const result = await login({ email, password });
        if (!result.ok) {
            setError(result.error ?? "Sign in failed");
            setProcessing(false);
        }
    };

    const skipLogin = () => {
        loginWithToken(
            { fullName: "Debug User", email: "debug@local" },
            "debug-token",
        );
    };

    return (
        <form className="flex flex-col" onSubmit={submit} noValidate>
            {import.meta.env.DEV ? (
                <Button
                    className="fixed right-4 top-4 z-50 text-xs text-foreground-lighter"
                    onClick={skipLogin}
                    size="sm"
                    type="button"
                    variant="ghost"
                >
                    Skip login (debug)
                </Button>
            ) : null}
            <FieldGroup className="gap-6">
                <div className="mb-4 flex flex-col items-start gap-2 text-left">
                    <h1 className="text-3xl font-medium tracking-tight">
                        Welcome back
                    </h1>
                    <p className="text-sm text-balance text-foreground-light">
                        Sign in to continue.
                    </p>
                </div>

                {error ? (
                    <div
                        role="alert"
                        className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                    >
                        {error}
                    </div>
                ) : null}

                <Field>
                    <FieldLabel htmlFor="email">Email</FieldLabel>
                    <Input
                        autoComplete="email"
                        id="email"
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="you@example.com"
                        required
                        type="email"
                        value={email}
                    />
                    <FieldError />
                </Field>

                <Field>
                    <div className="flex items-center">
                        <FieldLabel htmlFor="password">Password</FieldLabel>
                    </div>
                    <div className="relative">
                        <Input
                            className="pr-10 text-[20px]"
                            autoComplete="current-password"
                            id="password"
                            onChange={(event) => setPassword(event.target.value)}
                            placeholder="********"
                            required
                            type={showPassword ? "text" : "password"}
                            value={password}
                        />
                        <button
                            aria-label={
                                showPassword ? "Hide password" : "Show password"
                            }
                            className="absolute inset-y-0 right-0 flex cursor-pointer items-center pr-3 text-foreground-muted transition-colors hover:text-foreground-default"
                            onClick={() =>
                                setShowPassword((current) => !current)
                            }
                            type="button"
                        >
                            {showPassword ? (
                                <IconEyeOff size={18} stroke={1.8} />
                            ) : (
                                <IconEye size={18} stroke={1.8} />
                            )}
                        </button>
                    </div>
                    <FieldError />
                </Field>

                <Field>
                    <Button
                        disabled={processing}
                        type="submit"
                        className="mt-3"
                        variant="submit"
                    >
                        {processing ? <Spinner data-icon="inline-start" /> : null}
                        <span className="truncate">
                            {processing ? "Signing in..." : "Sign in"}
                        </span>
                    </Button>
                    <FieldDescription className="pt-6 text-center text-sm text-foreground-light">
                        Don&apos;t have an account?{" "}
                        <button
                            type="button"
                            className="cursor-pointer font-medium text-brand-default underline-offset-4 hover:underline"
                            onClick={onSwitchToRegister}
                        >
                            Sign up
                        </button>
                    </FieldDescription>
                </Field>
            </FieldGroup>
        </form>
    );
}
