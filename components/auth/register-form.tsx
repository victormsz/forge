"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { registerWithEmail } from "@/app/auth/email/actions";
import { REGISTER_FORM_INITIAL_STATE } from "@/lib/auth/register-form-state";

function SubmitButton() {
    const { pending } = useFormStatus();

    return (
        <button
            type="submit"
            disabled={pending}
            className="w-full rounded-full bg-rose-400 px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-black transition hover:bg-rose-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
            {pending ? "Registering..." : "Create account"}
        </button>
    );
}

type RegisterFormProps = {
    defaultPlan?: string;
};

export function RegisterForm({ defaultPlan }: RegisterFormProps) {
    const [state, formAction] = useActionState(registerWithEmail, REGISTER_FORM_INITIAL_STATE);

    return (
        <form action={formAction} className="space-y-4">
            {defaultPlan && <input type="hidden" name="plan" value={defaultPlan} />}
            <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-semibold text-white/80">Display name</label>
                <input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="Aelar the Bold"
                    className="w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-rose-300 focus:outline-none"
                />
            </div>
            <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-semibold text-white/80">Email</label>
                <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    placeholder="you@example.com"
                    className="w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-rose-300 focus:outline-none"
                />
            </div>
            <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-semibold text-white/80">Password</label>
                <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    minLength={8}
                    className="w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-rose-300 focus:outline-none"
                />
            </div>
            <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-semibold text-white/80">Confirm password</label>
                <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    minLength={8}
                    className="w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-rose-300 focus:outline-none"
                />
            </div>

            {state.status === "error" && (
                <p className="rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">{state.message}</p>
            )}
            {state.status === "success" && (
                <div className="space-y-2 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                    <p>{state.message}</p>
                    {state.verificationUrl && (
                        <p className="text-xs text-emerald-200/80">Dev shortcut: <span className="font-semibold break-words">{state.verificationUrl}</span></p>
                    )}
                </div>
            )}

            <SubmitButton />
        </form>
    );
}
