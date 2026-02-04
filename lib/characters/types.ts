import type { AbilityGenerationMethod } from "@prisma/client";

import type { AbilityKey, AbilityScores } from "@/lib/point-buy";

export interface CharacterProficiencies {
    armor: string[];
    weapons: string[];
    tools: string[];
    skills: string[];
    languages: string[];
}

export interface CreateCharacterInput {
    name: string;
    generationMethod: AbilityGenerationMethod;
    ancestry: string | null;
    charClass: string | null;
    background: string | null;
    alignment: string | null;
    abilityScores: AbilityScores;
    proficiencies: CharacterProficiencies;
}

export interface AbilityIncreaseChoice {
    ability: AbilityKey;
    amount: number;
}

export interface LevelUpInput {
    characterId: string;
    subclass: string | null;
    feat: string | null;
    abilityIncreases: AbilityIncreaseChoice[];
    notes: string | null;
    hitDiceRoll: number;
}

export interface LevelUpChoicesMeta extends LevelUpInput {
    fromLevel: number;
    toLevel: number;
    appliedAt: string;
}

export const EMPTY_PROFICIENCIES: CharacterProficiencies = {
    armor: [],
    weapons: [],
    tools: [],
    skills: [],
    languages: [],
};
