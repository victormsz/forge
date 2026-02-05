import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { createPartyInvite } from "@/app/parties/actions";
import { getCurrentActor } from "@/lib/current-actor";
import { canCreateParties, getPartyPlanLimits } from "@/lib/parties/limits";
import { prisma } from "@/lib/prisma";

function getBaseUrl() {
    return process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
}

export const metadata: Metadata = {
    title: "ForgeSheet | Party",
    description: "Manage party members, invitations, and DM resources.",
};

type PartyPageProps = {
    params: Promise<{ id: string }>;
};

export default async function PartyDetailPage({ params }: PartyPageProps) {
    const { id } = await params;
    const actor = await getCurrentActor();

    if (!actor) {
        redirect("/");
    }

    const party = await prisma.party.findUnique({
        where: { id },
        include: {
            owner: { select: { id: true, name: true, email: true, plan: true } },
            members: {
                include: { user: { select: { id: true, name: true, email: true } } },
                orderBy: { joinedAt: "asc" },
            },
            invites: {
                where: { status: "pending" },
                orderBy: { createdAt: "desc" },
            },
            chat: { select: { id: true } },
        },
    });

    if (!party) {
        notFound();
    }

    const isOwner = party.ownerId === actor.userId;
    const isMember = isOwner || party.members.some((member) => member.userId === actor.userId);

    if (!isMember) {
        notFound();
    }

    const canManage = isOwner && canCreateParties(actor.role, actor.plan);
    const limits = getPartyPlanLimits(party.owner.plan);
    const inviteBaseUrl = getBaseUrl();

    const playerMembers = party.members.filter((member) => member.role === "player");
    const playerIds = playerMembers.map((member) => member.userId);

    const memberCharacters = isOwner && playerIds.length > 0
        ? await prisma.character.findMany({
            where: { userId: { in: playerIds } },
            select: { id: true, name: true, level: true, userId: true },
            orderBy: { updatedAt: "desc" },
        })
        : [];

    return (
        <div className="min-h-screen bg-forge text-white">
            <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-16 sm:px-6 lg:px-8">
                <header className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-rose-200">Party</p>
                        <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">{party.name}</h1>
                        <p className="mt-2 text-sm text-white/60">
                            DM: {party.owner.name ?? party.owner.email ?? "Dungeon Master"}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <Link
                            href="/parties"
                            className="rounded-xl border border-white/30 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10 hover:border-white/50"
                        >
                            Back to parties
                        </Link>
                        {party.chat && (
                            <Link
                                href={`/parties/${party.id}/chat`}
                                className="rounded-xl bg-rose-400 px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-rose-300"
                            >
                                Open chat
                            </Link>
                        )}
                    </div>
                </header>

                <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                        <h2 className="text-lg font-semibold">Party members</h2>
                        <div className="mt-4 space-y-3">
                            {party.members.map((member) => (
                                <div key={member.id} className="flex items-center justify-between rounded-xl border border-white/15 bg-black/30 px-4 py-3">
                                    <div>
                                        <p className="text-sm font-semibold text-white">
                                            {member.user.name ?? member.user.email ?? "Player"}
                                        </p>
                                        <p className="text-xs text-white/50">{member.role === "dm" ? "Dungeon Master" : "Player"}</p>
                                    </div>
                                    <span className="text-xs text-white/50">Joined {member.joinedAt.toLocaleDateString()}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                        <h2 className="text-lg font-semibold">Invites</h2>
                        {canManage ? (
                            <>
                                <p className="mt-2 text-xs text-white/60">
                                    {typeof limits.maxPlayersPerParty === "number" && limits.maxPlayersPerParty > 0
                                        ? `Max ${limits.maxPlayersPerParty} players per party.`
                                        : "Unlimited players for this party."}
                                </p>
                                <form action={createPartyInvite} className="mt-4 space-y-3">
                                    <input type="hidden" name="partyId" value={party.id} />
                                    <input
                                        name="email"
                                        placeholder="player@email.com"
                                        className="w-full rounded-xl border border-white/20 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-rose-300/40"
                                    />
                                    <button
                                        type="submit"
                                        className="w-full rounded-xl bg-rose-400 px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-black transition hover:bg-rose-300"
                                    >
                                        Send invite
                                    </button>
                                </form>
                            </>
                        ) : (
                            <p className="mt-3 text-sm text-white/60">Only the DM can send invites.</p>
                        )}

                        {canManage && party.invites.length > 0 && (
                            <div className="mt-6 space-y-3">
                                {party.invites.map((invite) => (
                                    <div key={invite.id} className="rounded-xl border border-white/15 bg-black/30 px-4 py-3 text-sm">
                                        <p className="text-white">{invite.email}</p>
                                        <p className="mt-1 text-xs text-white/50">Expires {invite.expiresAt.toLocaleDateString()}</p>
                                        <p className="mt-2 text-xs text-white/60 break-all">
                                            {inviteBaseUrl}/parties/invitations/{invite.token}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </section>

                {isOwner && (
                    <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
                        <h2 className="text-lg font-semibold">Player character sheets</h2>
                        <p className="mt-2 text-sm text-white/60">Open any character sheet to review party builds.</p>
                        {memberCharacters.length === 0 ? (
                            <p className="mt-4 text-sm text-white/60">No characters found for party members yet.</p>
                        ) : (
                            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                {memberCharacters.map((character) => {
                                    const owner = playerMembers.find((member) => member.userId === character.userId);
                                    return (
                                        <Link
                                            key={character.id}
                                            href={`/characters/${character.id}`}
                                            className="rounded-xl border border-white/15 bg-black/30 px-4 py-3 transition hover:border-rose-300/60"
                                        >
                                            <p className="text-sm font-semibold text-white">{character.name}</p>
                                            <p className="mt-1 text-xs text-white/60">
                                                Level {character.level} · {owner?.user.name ?? owner?.user.email ?? "Player"}
                                            </p>
                                        </Link>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                )}
            </main>
        </div>
    );
}
