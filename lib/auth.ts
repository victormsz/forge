import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import DiscordProvider from "next-auth/providers/discord";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";

import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password-utils";

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const discordClientId = process.env.DISCORD_CLIENT_ID;
const discordClientSecret = process.env.DISCORD_CLIENT_SECRET;

if (!googleClientId || !googleClientSecret) {
    console.warn("Google OAuth credentials are missing. Add them to your .env file to enable Google sign-in.");
}

if (!discordClientId || !discordClientSecret) {
    console.warn("Discord OAuth credentials are missing. Add them to your .env file to enable Discord sign-in.");
}

export const authOptions: NextAuthOptions = {
    adapter: PrismaAdapter(prisma),
    session: {
        strategy: "database",
    },
    providers: [
        GoogleProvider({
            clientId: googleClientId ?? "",
            clientSecret: googleClientSecret ?? "",
            allowDangerousEmailAccountLinking: true,
        }),
        DiscordProvider({
            clientId: discordClientId ?? "",
            clientSecret: discordClientSecret ?? "",
            allowDangerousEmailAccountLinking: true,
        }),
        CredentialsProvider({
            id: "credentials",
            name: "Email",
            credentials: {
                email: { label: "Email", type: "text" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error("Email and password are required.");
                }

                const email = credentials.email.trim().toLowerCase();
                const user = await prisma.user.findUnique({ where: { email } });

                if (!user || !user.hashedPassword) {
                    throw new Error("No account found for that email.");
                }

                if (!user.emailVerified) {
                    throw new Error("Please verify your email before signing in.");
                }

                const valid = await verifyPassword(credentials.password, user.hashedPassword);

                if (!valid) {
                    throw new Error("Invalid email or password.");
                }

                return user;
            },
        }),
    ],
    callbacks: {
        async session({ session, user }) {
            if (session.user) {
                session.user.id = user.id;
                session.user.name = user.name ?? session.user.name;
                session.user.email = user.email ?? session.user.email;
                session.user.role = user.role;
                session.user.plan = user.plan;
            }
            return session;
        },
    },
    secret: process.env.NEXTAUTH_SECRET,
    pages: {
        signIn: "/auth/email/login",
    },
};

