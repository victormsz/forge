import { AbilityGenerationMethod } from "@prisma/client";

import {
    ABILITY_KEYS,
    DEFAULT_ABILITY_SCORES,
    MAX_ABILITY_SCORE,
    MIN_ABILITY_SCORE,
    POINT_BUY_BUDGET,
    RANDOM_MAX_ABILITY_SCORE,
    RANDOM_MIN_ABILITY_SCORE,
    calculatePointBuyCost,
    type AbilityKey,
    type AbilityScores,
} from "@/lib/point-buy";

import {
    type AbilityIncreaseChoice,
    EMPTY_PROFICIENCIES,
    type CharacterProficiencies,
    type CreateCharacterInput,
    type LevelUpInput,
} from "@/lib/characters/types";

const allowedMethods = new Set<AbilityGenerationMethod>([AbilityGenerationMethod.POINT_BUY, AbilityGenerationMethod.RANDOM]);

interface AbilityScoreBounds {
    min?: number;
    max?: number;
}

function readString(value: FormDataEntryValue | null, fallback: string | null = null, maxLength = 180) {
    if (typeof value !== "string") {
        return fallback;
    }

    const trimmed = value.trim();

    if (!trimmed) {
        return fallback;
    }

    return trimmed.slice(0, maxLength);
}

function parseAbilityScores(input: FormDataEntryValue | null, bounds?: AbilityScoreBounds): AbilityScores {
    const fallback: AbilityScores = { ...DEFAULT_ABILITY_SCORES };
    const minValue = bounds?.min ?? MIN_ABILITY_SCORE;
    const maxValue = bounds?.max ?? MAX_ABILITY_SCORE;

    if (typeof input !== "string") {
        return fallback;
    }

    try {
        const parsed = JSON.parse(input) as Record<string, unknown>;

        for (const ability of ABILITY_KEYS) {
            const rawValue = parsed[ability];
            const numericValue = typeof rawValue === "number" ? Math.trunc(rawValue) : Number(rawValue);

            if (Number.isFinite(numericValue)) {
                const boundedValue = Math.min(maxValue, Math.max(minValue, numericValue));
                fallback[ability] = boundedValue;
            }
        }
    } catch {
        return fallback;
    }

    return fallback;
}

function parseProficiencies(input: FormDataEntryValue | null): CharacterProficiencies {
    if (typeof input !== "string") {
        return { ...EMPTY_PROFICIENCIES };
    }

    try {
        const parsed = JSON.parse(input) as Partial<Record<keyof CharacterProficiencies, unknown>>;
        const coerce = (value: unknown): string[] => {
            if (!Array.isArray(value)) {
                return [];
            }
            return value
                .filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
                .map((entry) => entry.trim())
                .slice(0, 12);
        };

        return {
            armor: coerce(parsed.armor),
            weapons: coerce(parsed.weapons),
            tools: coerce(parsed.tools),
            skills: coerce(parsed.skills),
            languages: coerce(parsed.languages),
        };
    } catch {
        return { ...EMPTY_PROFICIENCIES };
    }
}

function parseAbilityIncreaseChoice(input: FormDataEntryValue | null): AbilityIncreaseChoice | null {
    if (typeof input !== "string") {
        return null;
    }

    const key = input.trim().toLowerCase();

    if (!ABILITY_KEYS.includes(key as AbilityKey)) {
        return null;
    }

    return { ability: key as AbilityKey, amount: 1 };
}

export function parseCreateCharacterFormData(formData: FormData): CreateCharacterInput {
    const methodInput = formData.get("method");
    const generationMethod = allowedMethods.has(methodInput as AbilityGenerationMethod)
        ? (methodInput as AbilityGenerationMethod)
        : AbilityGenerationMethod.POINT_BUY;

    const abilityScores = parseAbilityScores(
        formData.get("abilityScores"),
        generationMethod === AbilityGenerationMethod.RANDOM
            ? { min: RANDOM_MIN_ABILITY_SCORE, max: RANDOM_MAX_ABILITY_SCORE }
            : { min: MIN_ABILITY_SCORE, max: MAX_ABILITY_SCORE },
    );

    return {
        name: readString(formData.get("name"), "New Adventurer", 120)!,
        generationMethod,
        ancestry: readString(formData.get("ancestry")),
        charClass: readString(formData.get("class")),
        background: readString(formData.get("background")),
        alignment: readString(formData.get("alignment")),
        abilityScores,
        proficiencies: parseProficiencies(formData.get("proficiencies")),
    };
}

export function parseLevelUpFormData(formData: FormData): LevelUpInput {
    const characterId = readString(formData.get("characterId"));

    if (!characterId) {
        throw new Error("Character id missing.");
    }

    const abilityIncreases = [
        parseAbilityIncreaseChoice(formData.get("abilityIncreasePrimary")),
        parseAbilityIncreaseChoice(formData.get("abilityIncreaseSecondary")),
    ].filter(Boolean) as AbilityIncreaseChoice[];

    const trimmedAbilityIncreases = abilityIncreases.slice(0, 2);

    return {
        characterId,
        subclass: readString(formData.get("subclass")),
        feat: readString(formData.get("feat")),
        abilityIncreases: trimmedAbilityIncreases,
        notes: readString(formData.get("notes"), null, 800),
    };
}

export function assertPointBuyWithinBudget(scores: AbilityScores) {
    const totalCost = calculatePointBuyCost(scores);
    if (totalCost > POINT_BUY_BUDGET) {
        throw new Error("Point buy exceeds the allowed budget.");
    }
}
