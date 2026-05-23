import { type FormEvent, useState } from "react";
import { toast } from "sonner";
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

interface RegisterProps {
    onSwitchToLogin: () => void;
}

export function Register({ onSwitchToLogin }: RegisterProps) {
    const { register } = useAuth();
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (processing) return;
        setError(null);
        setProcessing(true);
        const result = await register({
            fullName,
            email,
            password,
            confirmPassword,
        });
        if (!result.ok) {
            setError(result.error ?? "Could not create account");
            setProcessing(false);
            return;
        }
        toast.success("Account created");
    };

    return (
        <form className="flex flex-col" onSubmit={submit} noValidate>
            <FieldGroup className="gap-6">
                <div className="mb-4 flex flex-col items-start gap-2 text-left">
                    <h1 className="text-3xl font-medium tracking-tight">
                        Create your account
                    </h1>
                    <p className="text-sm text-balance text-foreground-light">
                        Fill your account details
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
                    <FieldLabel htmlFor="fullname">Full Name</FieldLabel>
                    <Input
                        autoComplete="name"
                        id="fullname"
                        onChange={(event) => setFullName(event.target.value)}
                        placeholder="John Doe"
                        required
                        type="text"
                        value={fullName}
                    />
                    <FieldError />
                </Field>

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
                    <FieldLabel htmlFor="password">Password</FieldLabel>
                    <div className="relative">
                        <Input
                            autoComplete="new-password"
                            className="pr-10 text-[20px]"
                            id="password"
                            minLength={8}
                            onChange={(event) => setPassword(event.target.value)}
                            placeholder="••••••••"
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
                    <FieldLabel htmlFor="confirmPassword">
                        Confirm Password
                    </FieldLabel>
                    <div className="relative">
                        <Input
                            autoComplete="new-password"
                            className="pr-10 text-[20px]"
                            id="confirmPassword"
                            onChange={(event) =>
                                setConfirmPassword(event.target.value)
                            }
                            placeholder="••••••••"
                            required
                            type={showConfirmPassword ? "text" : "password"}
                            value={confirmPassword}
                        />
                        <button
                            aria-label={
                                showConfirmPassword
                                    ? "Hide password"
                                    : "Show password"
                            }
                            className="absolute inset-y-0 right-0 flex cursor-pointer items-center pr-3 text-foreground-muted transition-colors hover:text-foreground-default"
                            onClick={() =>
                                setShowConfirmPassword((current) => !current)
                            }
                            type="button"
                        >
                            {showConfirmPassword ? (
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
                            {processing
                                ? "Creating account..."
                                : "Create Account"}
                        </span>
                    </Button>
                </Field>

                <Field>
                    <FieldDescription className="pt-2 text-center text-sm text-foreground-light">
                        Already have an account?{" "}
                        <button
                            type="button"
                            className="cursor-pointer font-medium text-brand-default underline-offset-4 hover:underline"
                            onClick={onSwitchToLogin}
                        >
                            Sign In
                        </button>
                    </FieldDescription>
                </Field>
            </FieldGroup>
        </form>
    );
}
