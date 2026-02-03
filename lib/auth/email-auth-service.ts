import { randomBytes } from "node:crypto";

import { hashPassword } from "@/lib/auth/password-utils";
import { prisma } from "@/lib/prisma";

const VERIFICATION_TTL_MINUTES = 60;

interface RegisterEmailInput {
    name?: string | null;
    email: string;
    password: string;
}

export async function registerEmailAccount({ name, email, password }: RegisterEmailInput) {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
        throw new Error("Email is required.");
    }

    if (password.length < 8) {
        throw new Error("Password must be at least 8 characters long.");
    }

    const hashedPassword = await hashPassword(password);
    const verificationToken = randomBytes(32).toString("hex");
    const verificationExpires = new Date(Date.now() + VERIFICATION_TTL_MINUTES * 60 * 1000);

    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (existingUser && existingUser.hashedPassword) {
        throw new Error("An account with this email already exists.");
    }

    if (existingUser) {
        await prisma.user.update({
            where: { id: existingUser.id },
            data: {
                name: name?.trim() || existingUser.name,
                hashedPassword,
                emailVerificationToken: verificationToken,
                emailVerificationExpires: verificationExpires,
                emailVerified: null,
                isGuest: false,
            },
        });
    } else {
        await prisma.user.create({
            data: {
                email: normalizedEmail,
                name: name?.trim() || "Adventurer",
                hashedPassword,
                emailVerificationToken: verificationToken,
                emailVerificationExpires: verificationExpires,
                isGuest: false,
            },
        });
    }

    return { verificationToken, expiresAt: verificationExpires };
}

export async function verifyEmailToken(token: string) {
    if (!token) {
        throw new Error("Verification token missing.");
    }

    const user = await prisma.user.findFirst({ where: { emailVerificationToken: token } });

    if (!user) {
        throw new Error("Invalid or expired verification link.");
    }

    if (user.emailVerificationExpires && user.emailVerificationExpires.getTime() < Date.now()) {
        throw new Error("Verification link has expired. Please register again.");
    }

    await prisma.user.update({
        where: { id: user.id },
        data: {
            emailVerified: new Date(),
            emailVerificationToken: null,
            emailVerificationExpires: null,
        },
    });

    return { email: user.email };
}
