import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { createParty, createPartyChat } from "@/app/parties/actions";
import { getCurrentActor } from "@/lib/current-actor";
import { canCreateParties, canJoinParties, getPartyPlanLimits } from "@/lib/parties/limits";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
    title: "ForgeSheet | Parties",
    description: "Manage your parties, invitations, and party chat as a Dungeon Master or player.",
};

export default async function PartiesPage() {
    const actor = await getCurrentActor();

    if (!actor) {
        redirect("/");
    }

    const canJoin = canJoinParties(actor.plan);
    const canCreate = canCreateParties(actor.role, actor.plan);
    const limits = getPartyPlanLimits(actor.plan);

    if (!canJoin) {
        return (
            <div className="min-h-screen bg-forge text-white">
                <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-16 sm:px-6 lg:px-8">
                    <header className="space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-rose-200">Parties</p>
                        <h1 className="text-3xl font-semibold">Party access locked</h1>
                        <p className="text-sm text-white/70">Guest accounts cannot join parties. Sign in or upgrade to unlock party access.</p>
                    </header>
                    <Link
                        href="/"
                        className="rounded-full border border-white/20 px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:border-rose-200"
                    >
                        Back to home
                    </Link>
                </main>
            </div>
        );
    }

    const [ownedParties, memberParties] = await Promise.all([
        prisma.party.findMany({
            where: { ownerId: actor.userId },
            include: {
                chat: { select: { id: true } },
                _count: { select: { members: true } },
            },
            orderBy: { updatedAt: "desc" },
        }),
        prisma.party.findMany({
            where: {
                members: { some: { userId: actor.userId } },
                ownerId: { not: actor.userId },
            },
            include: {
                owner: { select: { name: true, email: true } },
                _count: { select: { members: true } },
            },
            orderBy: { updatedAt: "desc" },
        }),
    ]);

    return (
        <div className="min-h-screen bg-forge text-white">
            <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-16 sm:px-6 lg:px-8">
                <header className="space-y-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-rose-200">Parties</p>
                    <h1 className="text-3xl font-semibold sm:text-4xl">Manage your party roster</h1>
                    <p className="max-w-2xl text-sm text-white/70">Create parties, invite players, and keep chat messages rolling.</p>
                </header>

                {canCreate && (
                    <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
                        <h2 className="text-lg font-semibold">Create a new party</h2>
                        <p className="mt-2 text-sm text-white/60">
                            {typeof limits.maxParties === "number" && limits.maxParties > 0
                                ? `Plan limit: ${limits.maxParties} party${limits.maxParties === 1 ? "" : "ies"}.`
                                : "Unlimited parties available on your plan."}
                        </p>
                        <form action={createParty} className="mt-4 flex flex-wrap gap-3">
                            <input
                                name="name"
                                placeholder="Party name"
                                className="w-full flex-1 rounded-xl border border-white/20 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-rose-300/40"
                            />
                            <button
                                type="submit"
                                className="rounded-xl bg-rose-400 px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-black transition hover:bg-rose-300"
                            >
                                Create party
                            </button>
                        </form>
                    </section>
                )}

                <section className="grid gap-6 lg:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold">Your parties</h2>
                            <span className="text-xs uppercase tracking-[0.3em] text-white/50">DM</span>
                        </div>
                        {ownedParties.length === 0 ? (
                            <p className="mt-4 text-sm text-white/60">No parties created yet.</p>
                        ) : (
                            <div className="mt-4 space-y-3">
                                {ownedParties.map((party) => (
                                    <div key={party.id} className="rounded-xl border border-white/15 bg-black/30 px-4 py-3">
                                        <div className="flex items-center justify-between">
                                            <Link
                                                href={`/parties/${party.id}`}
                                                className="text-sm font-semibold text-white transition hover:text-rose-200"
                                            >
                                                {party.name}
                                            </Link>
                                            <span className="text-xs text-white/50">{party._count.members - 1} players</span>
                                        </div>
                                        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                                            <p className="text-xs text-white/50">Updated {party.updatedAt.toLocaleDateString()}</p>
                                            {party.chat ? (
                                                <Link
                                                    href={`/parties/${party.id}/chat`}
                                                    className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-200 hover:underline"
                                                >
                                                    Open chat
                                                </Link>
                                            ) : (
                                                <form action={createPartyChat}>
                                                    <input type="hidden" name="partyId" value={party.id} />
                                                    <button
                                                        type="submit"
                                                        className="rounded-full border border-white/20 px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-white transition hover:border-rose-200"
                                                    >
                                                        Create chat
                                                    </button>
                                                </form>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold">Joined parties</h2>
                            <span className="text-xs uppercase tracking-[0.3em] text-white/50">Player</span>
                        </div>
                        {memberParties.length === 0 ? (
                            <p className="mt-4 text-sm text-white/60">No party invites accepted yet.</p>
                        ) : (
                            <div className="mt-4 space-y-3">
                                {memberParties.map((party) => (
                                    <Link
                                        key={party.id}
                                        href={`/parties/${party.id}`}
                                        className="block rounded-xl border border-white/15 bg-black/30 px-4 py-3 transition hover:border-sky-300/60"
                                    >
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-semibold text-white">{party.name}</p>
                                            <span className="text-xs text-white/50">{party._count.members - 1} players</span>
                                        </div>
                                        <p className="mt-1 text-xs text-white/50">
                                            DM: {party.owner.name ?? party.owner.email ?? "Dungeon Master"}
                                        </p>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                </section>
            </main>
        </div>
    );
}
