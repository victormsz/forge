import { prisma } from "@/lib/prisma";
import type { CurrentActor } from "@/lib/current-actor";

export async function canViewCharacterSheet(actor: CurrentActor, characterOwnerId: string) {
    if (actor.userId === characterOwnerId) {
        return true;
    }

    if (actor.role !== "dm" || (actor.plan !== "basic_dm" && actor.plan !== "premium_dm")) {
        return false;
    }

    const party = await prisma.party.findFirst({
        where: {
            ownerId: actor.userId,
            members: {
                some: {
                    userId: characterOwnerId,
                },
            },
        },
        select: { id: true },
    });

    return Boolean(party);
}

export async function requirePartyMember(partyId: string, userId: string) {
    const party = await prisma.party.findFirst({
        where: {
            id: partyId,
            OR: [
                { ownerId: userId },
                { members: { some: { userId } } },
            ],
        },
        select: {
            id: true,
            ownerId: true,
            name: true,
            chat: { select: { id: true } },
        },
    });

    if (!party) {
        throw new Error("Party not found or access denied.");
    }

    return party;
}
