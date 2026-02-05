import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { acceptPartyInvite, declinePartyInvite } from "@/app/parties/actions";
import { getCurrentActor } from "@/lib/current-actor";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
    title: "ForgeSheet | Party Invite",
    description: "Accept or decline a party invitation.",
};

type InvitationPageProps = {
    params: Promise<{ token: string }>;
};

export default async function PartyInvitationPage({ params }: InvitationPageProps) {
    const { token } = await params;
    const actor = await getCurrentActor();

    if (!actor) {
        redirect("/auth/email/login");
    }

    const invite = await prisma.partyInvite.findFirst({
        where: { token, status: "pending" },
        include: { party: { select: { name: true } } },
    });

    if (!invite) {
        return (
            <div className="min-h-screen bg-forge text-white">
                <main className="mx-auto flex w-full max-w-lg flex-col gap-4 px-4 py-16">
                    <h1 className="text-2xl font-semibold">Invite unavailable</h1>
                    <p className="text-sm text-white/60">This invite is no longer valid.</p>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-forge text-white">
            <main className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-16">
                <header className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-rose-200">Party Invite</p>
                    <h1 className="text-3xl font-semibold">Join {invite.party.name}</h1>
                    <p className="text-sm text-white/70">Accept to link your account to this party.</p>
                </header>

                <form action={acceptPartyInvite} className="space-y-3">
                    <input type="hidden" name="token" value={token} />
                    <button
                        type="submit"
                        className="w-full rounded-xl bg-rose-400 px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-black transition hover:bg-rose-300"
                    >
                        Accept invite
                    </button>
                </form>

                <form action={declinePartyInvite} className="space-y-3">
                    <input type="hidden" name="token" value={token} />
                    <button
                        type="submit"
                        className="w-full rounded-xl border border-white/20 px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:border-rose-200"
                    >
                        Decline invite
                    </button>
                </form>
            </main>
        </div>
    );
}
