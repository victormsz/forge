export const ABILITY_KEYS = ["str", "dex", "con", "int", "wis", "cha"] as const;
export type AbilityKey = (typeof ABILITY_KEYS)[number];

export type AbilityScores = Record<AbilityKey, number>;

export const MIN_ABILITY_SCORE = 8;
export const MAX_ABILITY_SCORE = 15;
export const RANDOM_MIN_ABILITY_SCORE = 3;
export const RANDOM_MAX_ABILITY_SCORE = 18;
export const POINT_BUY_BUDGET = 27;

export const POINT_BUY_COSTS: Record<number, number> = {
    8: 0,
    9: 1,
    10: 2,
    11: 3,
    12: 4,
    13: 5,
    14: 7,
    15: 9,
};

export const DEFAULT_ABILITY_SCORES: AbilityScores = ABILITY_KEYS.reduce((scores, key) => {
    scores[key] = MIN_ABILITY_SCORE;
    return scores;
}, {} as AbilityScores);

export function calculatePointBuyCost(scores: AbilityScores): number {
    return ABILITY_KEYS.reduce((total, key) => {
        const score = scores[key];
        const cost = POINT_BUY_COSTS[score];
        if (typeof cost !== "number") {
            return POINT_BUY_BUDGET + total + 1;
        }
        return total + cost;
    }, 0);
}

export function getIncrementalPointCost(currentScore: number): number {
    const nextScore = currentScore + 1;
    if (nextScore > MAX_ABILITY_SCORE) {
        return Infinity;
    }
    const currentCost = POINT_BUY_COSTS[currentScore] ?? 0;
    const nextCost = POINT_BUY_COSTS[nextScore];
    if (typeof nextCost !== "number") {
        return Infinity;
    }
    return nextCost - currentCost;
}
