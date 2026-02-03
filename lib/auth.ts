import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import DiscordProvider from "next-auth/providers/discord";
import { PrismaAdapter } from "@next-auth/prisma-adapter";

import { prisma } from "@/lib/prisma";

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
    ],
    callbacks: {
        async session({ session, user }) {
            if (session.user) {
                session.user.id = user.id;
                session.user.name = user.name ?? session.user.name;
                session.user.email = user.email ?? session.user.email;
            }
            return session;
        },
    },
    secret: process.env.NEXTAUTH_SECRET,
    pages: {
        signIn: "/",
    },
};

