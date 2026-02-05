"use server";

import { registerEmailAccount } from "@/lib/auth/email-auth-service";
import type { RegisterFormState } from "@/lib/auth/register-form-state";

function getBaseUrl() {
    return process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
}

export async function registerWithEmail(_: RegisterFormState, formData: FormData): Promise<RegisterFormState> {
    const name = formData.get("name");
    const email = formData.get("email");
    const password = formData.get("password");
    const confirm = formData.get("confirmPassword");
    const plan = formData.get("plan");

    try {
        if (typeof email !== "string" || typeof password !== "string" || typeof confirm !== "string") {
            throw new Error("Please complete all required fields.");
        }

        if (password !== confirm) {
            throw new Error("Passwords do not match.");
        }

        const result = await registerEmailAccount({
            name: typeof name === "string" ? name : null,
            email,
            password,
            plan: typeof plan === "string" ? plan : null,
        });

        const verificationUrl = `${getBaseUrl()}/auth/email/verify?token=${result.verificationToken}`;

        if (process.env.NODE_ENV !== "production") {
            console.info(`Email verification link for ${email}: ${verificationUrl}`);
        }

        return {
            status: "success",
            verificationUrl,
            message: "Account created. Check your inbox for the verification link (also logged to the console in dev).",
        };
    } catch (error) {
        return {
            status: "error",
            message: error instanceof Error ? error.message : "Unable to register right now.",
        };
    }
}
