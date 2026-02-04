import type { AbilityKey, AbilityScores } from "@/lib/point-buy";

export interface AncestryBonuses {
    fixed: Partial<Record<AbilityKey, number>>;
    choice?: {
        count: number;
        amount: number;
        exclude?: AbilityKey[];
    };
}

const ANCESTRY_BONUSES: Record<string, AncestryBonuses> = {
    "Human": {
        fixed: {
            str: 1,
            dex: 1,
            con: 1,
            int: 1,
            wis: 1,
            cha: 1,
        },
    },
    "Elf": {
        fixed: { dex: 2 },
    },
    "Dwarf": {
        fixed: { con: 2 },
    },
    "Halfling": {
        fixed: { dex: 2 },
    },
    "Dragonborn": {
        fixed: { str: 2, cha: 1 },
    },
    "Gnome": {
        fixed: { int: 2 },
    },
    "Half-Elf": {
        fixed: { cha: 2 },
        choice: { count: 2, amount: 1, exclude: ["cha"] },
    },
    "Half-Orc": {
        fixed: { str: 2, con: 1 },
    },
    "Tiefling": {
        fixed: { cha: 2, int: 1 },
    },
};

export function getAncestryBonuses(ancestry: string | null): AncestryBonuses {
    if (!ancestry) {
        return { fixed: {} };
    }
    return ANCESTRY_BONUSES[ancestry] ?? { fixed: {} };
}

export function applyAncestryBonuses(
    baseScores: AbilityScores,
    ancestry: string | null,
    choices: Partial<Record<AbilityKey, number>> = {}
): AbilityScores {
    const bonuses = getAncestryBonuses(ancestry);
    const result = { ...baseScores };

    // Apply fixed bonuses
    for (const [ability, bonus] of Object.entries(bonuses.fixed)) {
        result[ability as AbilityKey] = (result[ability as AbilityKey] ?? 0) + bonus;
    }

    // Apply choice bonuses
    if (bonuses.choice && choices) {
        for (const [ability, bonus] of Object.entries(choices)) {
            result[ability as AbilityKey] = (result[ability as AbilityKey] ?? 0) + bonus;
        }
    }

    return result;
}
