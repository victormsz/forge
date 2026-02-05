import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma";

export const GUEST_COOKIE_NAME = "forge_guest_id";
const ONE_WEEK_SECONDS = 60 * 60 * 24 * 7;

export async function readGuestCookie(): Promise<string | null> {
    const store = await cookies();
    return store.get(GUEST_COOKIE_NAME)?.value ?? null;
}

export async function setGuestCookie(userId: string) {
    const store = await cookies();
    store.set(GUEST_COOKIE_NAME, userId, {
        httpOnly: true,
        sameSite: "lax",
        maxAge: ONE_WEEK_SECONDS,
        path: "/",
    });
}

export async function clearGuestCookie() {
    const store = await cookies();
    store.delete(GUEST_COOKIE_NAME);
}

export async function getGuestUserFromCookie() {
    const guestId = await readGuestCookie();

    if (!guestId) {
        return null;
    }

    const guestUser = await prisma.user.findUnique({
        where: { id: guestId },
        select: { id: true, name: true, email: true, role: true, plan: true },
    });

    if (!guestUser || guestUser.role !== "guest") {
        await clearGuestCookie();
        return null;
    }

    return guestUser;
}
