"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

type Step = "credentials" | "confirm";

export function EmailLoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const oauthError = searchParams?.get("error");
    const [step, setStep] = useState<Step>("credentials");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const maskedEmail = email.replace(/(^.).+(@.+$)/, (_, first: string, domain: string) => `${first}***${domain}`);

    const handleContinue = () => {
        if (!email || !password) {
            setError("Enter your email and password to continue.");
            return;
        }
        setError(null);
        setStep("confirm");
    };

    const handleBack = () => {
        setStep("credentials");
        setBusy(false);
    };

    const handleConfirm = async () => {
        setBusy(true);
        setError(null);
        const response = await signIn("credentials", {
            email,
            password,
            redirect: false,
            callbackUrl: "/dashboard",
        });

        if (response?.error) {
            setError(response.error);
            setBusy(false);
            setStep("credentials");
            return;
        }

        router.refresh();
        router.push("/dashboard");
    };

    return (
        <div className="space-y-4">
            {step === "credentials" && (
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label htmlFor="email" className="text-sm font-semibold text-white/80">Email</label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            autoComplete="email"
                            className="w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-rose-300 focus:outline-none"
                            placeholder="you@example.com"
                        />
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="password" className="text-sm font-semibold text-white/80">Password</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            autoComplete="current-password"
                            className="w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-rose-300 focus:outline-none"
                            placeholder="••••••••"
                        />
                    </div>
                    <button
                        type="button"
                        onClick={handleContinue}
                        className="w-full rounded-full bg-rose-400 px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-black transition hover:bg-rose-300"
                    >
                        Continue
                    </button>
                    <p className="text-xs text-white/50">After entering your credentials, we will ask you to confirm the sign-in so sessions are never created accidentally.</p>
                </div>
            )}

            {step === "confirm" && (
                <div className="space-y-4 rounded-3xl border border-white/10 bg-black/30 p-5">
                    <p className="text-sm text-white/80">Sign in as <span className="font-semibold text-white">{maskedEmail}</span>?</p>
                    <p className="text-xs text-white/60">Double-check the address and confirm to finalize the session.</p>
                    {error && <p className="rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-2 text-xs text-red-200">{error}</p>}
                    <div className="flex flex-wrap gap-3">
                        <button
                            type="button"
                            onClick={handleBack}
                            className="flex-1 rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/80"
                        >
                            Edit info
                        </button>
                        <button
                            type="button"
                            onClick={handleConfirm}
                            disabled={busy}
                            className="flex-1 rounded-full bg-rose-400 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-black disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {busy ? "Signing in..." : "Confirm"}
                        </button>
                    </div>
                </div>
            )}

            {error && step === "credentials" && (
                <p className="rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-2 text-xs text-red-200">{error}</p>
            )}
            {oauthError && oauthError !== "OAuthAccountNotLinked" && (
                <p className="rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-2 text-xs text-red-200">{oauthError}</p>
            )}
        </div>
    );
}
