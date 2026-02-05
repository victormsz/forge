import { randomBytes } from "node:crypto";

import type { UserPlan, UserRole } from "@prisma/client";

import { hashPassword } from "@/lib/auth/password-utils";
import { prisma } from "@/lib/prisma";

const VERIFICATION_TTL_MINUTES = 60;

interface RegisterEmailInput {
    name?: string | null;
    email: string;
    password: string;
    plan?: string | null;
}

const ALLOWED_PLANS: UserPlan[] = ["paid_player", "basic_dm", "premium_dm"];

function normalizePlan(plan?: string | null): UserPlan {
    if (plan && ALLOWED_PLANS.includes(plan as UserPlan)) {
        return plan as UserPlan;
    }
    return "paid_player";
}

function resolveRole(plan: UserPlan): UserRole {
    return plan === "basic_dm" || plan === "premium_dm" ? "dm" : "player";
}

export async function registerEmailAccount({ name, email, password, plan }: RegisterEmailInput) {
    const normalizedEmail = email.trim().toLowerCase();

    const normalizedPlan = normalizePlan(plan);
    const role = resolveRole(normalizedPlan);

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
                role,
                plan: normalizedPlan,
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
                role,
                plan: normalizedPlan,
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
