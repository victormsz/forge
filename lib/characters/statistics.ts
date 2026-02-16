import { ABILITY_KEYS, type AbilityKey } from "@/lib/point-buy";
import type { CharacterProficiencies } from "@/lib/characters/types";
import { getProficiencyBonus as getJsonProficiencyBonus } from "@/lib/characters/leveling/level-data";

export const SKILL_CONFIG = [
    { key: "acrobatics", label: "Acrobatics", ability: "dex" },
    { key: "animal handling", label: "Animal Handling", ability: "wis" },
    { key: "arcana", label: "Arcana", ability: "int" },
    { key: "athletics", label: "Athletics", ability: "str" },
    { key: "deception", label: "Deception", ability: "cha" },
    { key: "history", label: "History", ability: "int" },
    { key: "insight", label: "Insight", ability: "wis" },
    { key: "intimidation", label: "Intimidation", ability: "cha" },
    { key: "investigation", label: "Investigation", ability: "int" },
    { key: "medicine", label: "Medicine", ability: "wis" },
    { key: "nature", label: "Nature", ability: "int" },
    { key: "perception", label: "Perception", ability: "wis" },
    { key: "performance", label: "Performance", ability: "cha" },
    { key: "persuasion", label: "Persuasion", ability: "cha" },
    { key: "religion", label: "Religion", ability: "int" },
    { key: "sleight of hand", label: "Sleight of Hand", ability: "dex" },
    { key: "stealth", label: "Stealth", ability: "dex" },
    { key: "survival", label: "Survival", ability: "wis" },
] as const;

export type SkillConfig = (typeof SKILL_CONFIG)[number];

export interface SkillSummary extends Omit<SkillConfig, never> {
    proficient: boolean;
    total: number;
    base: number;
}

export function normalizeAbilityScores(raw: unknown): Record<AbilityKey, number> {
    const scores: Record<AbilityKey, number> = {
        str: 10,
        dex: 10,
        con: 10,
        int: 10,
        wis: 10,
        cha: 10,
    };

    if (raw && typeof raw === "object") {
        ABILITY_KEYS.forEach((key) => {
            const value = (raw as Record<string, unknown>)[key];
            if (typeof value === "number") {
                scores[key] = value;
            }
        });
    }

    return scores;
}

export function abilityModifier(score: number) {
    return Math.floor((score - 10) / 2);
}

export function formatModifier(value: number) {
    return value >= 0 ? `+${value}` : value.toString();
}

export function computeProficiencyBonus(level: number) {
    if (level <= 0) {
        return 2;
    }
    // Use the JSON-based proficiency bonus calculation
    return getJsonProficiencyBonus(level);
}

export function normalizeProficiencies(raw: unknown): CharacterProficiencies {
    const buckets: CharacterProficiencies = {
        armor: [],
        weapons: [],
        tools: [],
        skills: [],
        languages: [],
    };

    if (!raw || typeof raw !== "object") {
        return buckets;
    }

    const source = raw as Record<string, unknown>;

    (Object.keys(buckets) as (keyof CharacterProficiencies)[]).forEach((key) => {
        const value = source[key];
        if (Array.isArray(value)) {
            buckets[key] = value.filter((entry): entry is string => typeof entry === "string");
        }
    });

    return buckets;
}

function normalizeSkillName(value: string) {
    return value.trim().toLowerCase();
}

export function buildSkillSummaries(
    proficiencySet: CharacterProficiencies,
    abilityModifiers: Record<AbilityKey, number>,
    proficiencyBonus: number,
): SkillSummary[] {
    const skillLookup = new Set(proficiencySet.skills.map(normalizeSkillName));
    return SKILL_CONFIG.map((skill) => {
        const proficient = skillLookup.has(skill.key);
        const base = abilityModifiers[skill.ability];
        const total = base + (proficient ? proficiencyBonus : 0);
        return {
            ...skill,
            proficient,
            base,
            total,
        };
    });
}
