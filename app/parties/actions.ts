"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentActor } from "@/lib/current-actor";
import { prisma } from "@/lib/prisma";
import { canCreateParties, canJoinParties, getPartyPlanLimits } from "@/lib/parties/limits";

const INVITE_TTL_DAYS = 7;

function getBaseUrl() {
    return process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
}

function readString(value: FormDataEntryValue | null, label: string) {
    if (typeof value !== "string" || value.trim().length === 0) {
        throw new Error(`${label} is required.`);
    }
    return value.trim();
}

export async function createParty(formData: FormData) {
    const actor = await getCurrentActor();

    if (!actor) {
        throw new Error("Authentication required to create a party.");
    }

    if (!canCreateParties(actor.role, actor.plan)) {
        throw new Error("Your account does not allow party creation.");
    }

    const name = readString(formData.get("name"), "Party name");
    const limits = getPartyPlanLimits(actor.plan);

    if (typeof limits.maxParties === "number" && limits.maxParties > 0) {
        const existingParties = await prisma.party.count({ where: { ownerId: actor.userId } });
        if (existingParties >= limits.maxParties) {
            throw new Error("Your plan has reached its party limit.");
        }
    }

    const party = await prisma.$transaction(async (tx) => {
        const created = await tx.party.create({
            data: {
                name,
                ownerId: actor.userId,
            },
        });

        await tx.partyMember.create({
            data: {
                partyId: created.id,
                userId: actor.userId,
                role: "dm",
            },
        });

        await tx.partyChat.create({
            data: {
                partyId: created.id,
            },
        });

        return created;
    });

    revalidatePath("/parties");
    redirect(`/parties/${party.id}`);
}

export async function createPartyChat(formData: FormData) {
    const actor = await getCurrentActor();

    if (!actor) {
        throw new Error("Authentication required to create party chat.");
    }

    if (!canCreateParties(actor.role, actor.plan)) {
        throw new Error("Only Dungeon Masters can create party chat.");
    }

    const partyId = readString(formData.get("partyId"), "Party id");

    const party = await prisma.party.findFirst({
        where: { id: partyId, ownerId: actor.userId },
        select: { id: true, chat: { select: { id: true } } },
    });

    if (!party) {
        throw new Error("Party not found or access denied.");
    }

    if (!party.chat) {
        await prisma.partyChat.create({
            data: { partyId: party.id },
        });
    }

    revalidatePath("/parties");
    revalidatePath(`/parties/${party.id}`);
    redirect("/parties");
}

export async function createPartyInvite(formData: FormData) {
    const actor = await getCurrentActor();

    if (!actor) {
        throw new Error("Authentication required to invite players.");
    }

    if (!canCreateParties(actor.role, actor.plan)) {
        throw new Error("Only Dungeon Masters can invite players.");
    }

    const partyId = readString(formData.get("partyId"), "Party id");
    const email = readString(formData.get("email"), "Player email").toLowerCase();

    const party = await prisma.party.findFirst({
        where: { id: partyId, ownerId: actor.userId },
        include: {
            members: {
                include: { user: { select: { email: true } } },
            },
        },
    });

    if (!party) {
        throw new Error("Party not found or access denied.");
    }

    if (party.members.some((member) => member.user.email.toLowerCase() === email)) {
        throw new Error("That player is already in the party.");
    }

    const existingInvite = await prisma.partyInvite.findFirst({
        where: { partyId: party.id, email, status: "pending" },
        select: { id: true },
    });

    if (existingInvite) {
        throw new Error("That player already has a pending invite.");
    }

    const limits = getPartyPlanLimits(actor.plan);
    if (typeof limits.maxPlayersPerParty === "number" && limits.maxPlayersPerParty > 0) {
        const playerCount = party.members.filter((member) => member.role === "player").length;
        if (playerCount >= limits.maxPlayersPerParty) {
            throw new Error("Your plan has reached the player limit for this party.");
        }
    }

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);

    const invite = await prisma.partyInvite.create({
        data: {
            partyId: party.id,
            email,
            token,
            invitedById: actor.userId,
            expiresAt,
        },
        select: { token: true },
    });

    const inviteUrl = `${getBaseUrl()}/parties/invitations/${invite.token}`;

    if (process.env.NODE_ENV !== "production") {
        console.info(`Party invite for ${email}: ${inviteUrl}`);
    }

    revalidatePath(`/parties/${party.id}`);
    redirect(`/parties/${party.id}`);
}

export async function acceptPartyInvite(formData: FormData) {
    const actor = await getCurrentActor();

    if (!actor) {
        throw new Error("Sign in to accept party invites.");
    }

    if (!canJoinParties(actor.plan)) {
        throw new Error("Your account cannot join parties.");
    }

    if (!actor.email) {
        throw new Error("An email address is required to accept invites.");
    }

    const token = readString(formData.get("token"), "Invite token");
    const invite = await prisma.partyInvite.findFirst({
        where: { token, status: "pending" },
        include: {
            party: {
                include: {
                    owner: { select: { id: true, plan: true } },
                    members: true,
                },
            },
        },
    });

    if (!invite) {
        throw new Error("This invite is no longer valid.");
    }

    if (actor.email.toLowerCase() !== invite.email.toLowerCase()) {
        throw new Error("This invite was sent to a different email address.");
    }

    if (invite.expiresAt.getTime() < Date.now()) {
        await prisma.partyInvite.update({
            where: { id: invite.id },
            data: { status: "expired", respondedAt: new Date() },
        });
        throw new Error("This invite has expired.");
    }

    const ownerPlan = invite.party.owner.plan;
    const limits = getPartyPlanLimits(ownerPlan);

    if (typeof limits.maxPlayersPerParty === "number" && limits.maxPlayersPerParty > 0) {
        const playerCount = invite.party.members.filter((member) => member.role === "player").length;
        if (playerCount >= limits.maxPlayersPerParty) {
            throw new Error("This party has reached its player limit.");
        }
    }

    await prisma.$transaction(async (tx) => {
        await tx.partyMember.upsert({
            where: {
                partyId_userId: {
                    partyId: invite.partyId,
                    userId: actor.userId,
                },
            },
            update: { role: "player" },
            create: {
                partyId: invite.partyId,
                userId: actor.userId,
                role: "player",
            },
        });

        await tx.partyInvite.update({
            where: { id: invite.id },
            data: { status: "accepted", respondedAt: new Date() },
        });
    });

    revalidatePath("/parties");
    redirect(`/parties/${invite.partyId}`);
}

export async function declinePartyInvite(formData: FormData) {
    const actor = await getCurrentActor();

    if (!actor) {
        throw new Error("Sign in to decline party invites.");
    }

    if (!actor.email) {
        throw new Error("An email address is required to decline invites.");
    }

    const token = readString(formData.get("token"), "Invite token");
    const invite = await prisma.partyInvite.findFirst({
        where: { token, status: "pending" },
        select: { id: true, partyId: true, email: true },
    });

    if (!invite) {
        throw new Error("This invite is no longer valid.");
    }

    if (invite.email.toLowerCase() !== actor.email.toLowerCase()) {
        throw new Error("This invite was sent to a different email address.");
    }

    await prisma.partyInvite.update({
        where: { id: invite.id },
        data: { status: "declined", respondedAt: new Date() },
    });

    revalidatePath("/parties");
    redirect("/parties");
}
