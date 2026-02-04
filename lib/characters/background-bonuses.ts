import type { AbilityKey, AbilityScores } from "@/lib/point-buy";

export interface BackgroundBonuses {
    choices: AbilityKey[];
    amount: number;
}

const BACKGROUND_BONUSES: Record<string, BackgroundBonuses> = {
    "Acolyte": {
        choices: ["int", "wis", "cha"],
        amount: 1,
    },
    "Criminal": {
        choices: ["dex", "con", "int"],
        amount: 1,
    },
    "Sage": {
        choices: ["con", "int", "wis"],
        amount: 1,
    },
    "Soldier": {
        choices: ["str", "dex", "con"],
        amount: 1,
    },
};

export function getBackgroundBonuses(background: string | null): BackgroundBonuses | null {
    if (!background) {
        return null;
    }
    return BACKGROUND_BONUSES[background] ?? null;
}

export function applyBackgroundBonus(
    baseScores: AbilityScores,
    background: string | null,
    choice: AbilityKey | null
): AbilityScores {
    const bonuses = getBackgroundBonuses(background);
    if (!bonuses || !choice) {
        return baseScores;
    }

    const result = { ...baseScores };
    if (bonuses.choices.includes(choice)) {
        result[choice] = (result[choice] ?? 0) + bonuses.amount;
    }

    return result;
}
