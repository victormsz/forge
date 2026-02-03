import type { Session } from "next-auth";
import { getServerSession } from "next-auth";
import { cookies } from "next/headers";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GUEST_COOKIE_NAME, clearGuestCookie } from "@/lib/guest-session";

export interface CurrentActor {
    userId: string;
    isGuest: boolean;
    name?: string | null;
    email?: string | null;
}

export async function getCurrentActor(existingSession?: Session | null): Promise<CurrentActor | null> {
    const session = existingSession ?? (await getServerSession(authOptions));
    const cookieStore = await cookies();

    if (session?.user?.id) {
        if (cookieStore.get(GUEST_COOKIE_NAME)) {
            await clearGuestCookie();
        }

        return {
            userId: session.user.id,
            isGuest: false,
            name: session.user.name,
            email: session.user.email,
        };
    }

    const guestCookie = cookieStore.get(GUEST_COOKIE_NAME)?.value;

    if (!guestCookie) {
        return null;
    }

    const guestUser = await prisma.user.findUnique({
        where: { id: guestCookie },
        select: { id: true, name: true, email: true, isGuest: true },
    });

    if (!guestUser || !guestUser.isGuest) {
        await clearGuestCookie();
        return null;
    }

    return {
        userId: guestUser.id,
        isGuest: true,
        name: guestUser.name ?? "Guest Adventurer",
        email: guestUser.email,
    };
}
