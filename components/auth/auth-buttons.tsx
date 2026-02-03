"use client";

import { signIn, signOut } from "next-auth/react";
import { useState } from "react";

const providers = [
    { id: "google", label: "Continue with Google" },
    { id: "discord", label: "Continue with Discord" },
];

export function SignInButtons() {
    const [activeProvider, setActiveProvider] = useState<string | null>(null);

    const handleSelect = async (providerId: string) => {
        setActiveProvider(providerId);
        await signIn(providerId, { callbackUrl: "/" });
        setActiveProvider(null);
    };

    return (
        <div className="flex w-full flex-col gap-3">
            {providers.map((provider) => (
                <button
                    key={provider.id}
                    onClick={() => handleSelect(provider.id)}
                    className="rounded-full border border-black/10 bg-white px-6 py-3 text-sm font-semibold uppercase tracking-wide text-black shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                    disabled={!!activeProvider}
                >
                    {activeProvider === provider.id ? "Connecting..." : provider.label}
                </button>
            ))}
        </div>
    );
}

export function SignOutButton() {
    const [busy, setBusy] = useState(false);

    const handleSignOut = async () => {
        setBusy(true);
        await signOut({ callbackUrl: "/" });
        setBusy(false);
    };

    return (
        <button
            onClick={handleSignOut}
            className="w-full rounded-full border border-black/10 bg-black px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-black/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
            disabled={busy}
        >
            {busy ? "Closing spellbook..." : "Sign out"}
        </button>
    );
}
