import { DefaultSession } from "next-auth";

import type { UserPlan, UserRole } from "@prisma/client";

declare module "next-auth" {
    interface Session {
        user?: DefaultSession["user"] & {
            id: string;
            role: UserRole;
            plan: UserPlan;
        };
    }

    interface User {
        id: string;
        email: string;
        name?: string | null;
        role: UserRole;
        plan: UserPlan;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id?: string;
    }
}
