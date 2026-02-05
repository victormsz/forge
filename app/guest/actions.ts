"use server";

import { randomUUID } from "crypto";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { getGuestUserFromCookie, setGuestCookie } from "@/lib/guest-session";
import { prisma } from "@/lib/prisma";

export async function continueAsGuest() {
    const session = await getServerSession(authOptions);

    if (session?.user?.id) {
        redirect("/dashboard");
    }

    const existingGuest = await getGuestUserFromCookie();

    if (existingGuest) {
        redirect("/dashboard");
    }

    const guestUser = await prisma.user.create({
        data: {
            email: `guest-${randomUUID()}@guest.local`,
            name: "Guest Adventurer",
            role: "guest",
            plan: "guest",
        },
        select: { id: true },
    });

    await setGuestCookie(guestUser.id);
    redirect("/dashboard");
}
