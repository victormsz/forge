import type { Session } from "next-auth";
import { getServerSession } from "next-auth";
import { cookies } from "next/headers";

import type { UserPlan, UserRole } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GUEST_COOKIE_NAME } from "@/lib/guest-session";

export interface CurrentActor {
    userId: string;
    role: UserRole;
    plan: UserPlan;
    name?: string | null;
    email?: string | null;
}

export async function getCurrentActor(existingSession?: Session | null): Promise<CurrentActor | null> {
    const session = existingSession ?? (await getServerSession(authOptions));
    const cookieStore = await cookies();

    if (session?.user) {
        if (session.user.id) {
            const role = session.user.role ?? "player";
            const plan = session.user.plan ?? "paid_player";
            return {
                userId: session.user.id,
                role,
                plan,
                name: session.user.name,
                email: session.user.email,
            };
        }

        if (session.user.email) {
            const user = await prisma.user.findUnique({
                where: { email: session.user.email },
                select: { id: true, name: true, email: true, role: true, plan: true },
            });

            if (user) {
                return {
                    userId: user.id,
                    role: user.role,
                    plan: user.plan,
                    name: user.name,
                    email: user.email,
                };
            }
        }
    }

    const guestCookie = cookieStore.get(GUEST_COOKIE_NAME)?.value;

    if (!guestCookie) {
        return null;
    }

    const guestUser = await prisma.user.findUnique({
        where: { id: guestCookie },
        select: { id: true, name: true, email: true, role: true, plan: true },
    });

    if (!guestUser || guestUser.role !== "guest") {
        return null;
    }

    return {
        userId: guestUser.id,
        role: guestUser.role,
        plan: guestUser.plan,
        name: guestUser.name ?? "Guest Adventurer",
        email: guestUser.email,
    };
}
