import type { UserPlan, UserRole } from "@prisma/client";

export type PartyPlanLimits = {
    maxParties: number | null;
    maxPlayersPerParty: number | null;
};

export function canJoinParties(plan: UserPlan) {
    return plan !== "guest";
}

export function canCreateParties(role: UserRole, plan: UserPlan) {
    return role === "dm" && (plan === "basic_dm" || plan === "premium_dm");
}

export function canManageParties(role: UserRole, plan: UserPlan) {
    return canCreateParties(role, plan);
}

export function getPartyPlanLimits(plan: UserPlan): PartyPlanLimits {
    if (plan === "basic_dm") {
        return { maxParties: 1, maxPlayersPerParty: 5 };
    }
    if (plan === "premium_dm") {
        return { maxParties: null, maxPlayersPerParty: null };
    }
    return { maxParties: 0, maxPlayersPerParty: 0 };
}
