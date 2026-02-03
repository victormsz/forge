export interface LevelCustomPrompt {
    id: string;
    label: string;
    helper?: string;
    optional?: boolean;
}

export interface LevelRequirement {
    requiresSubclass: boolean;
    abilityScoreIncrements: number;
    allowFeatChoice: boolean;
    customPrompts: LevelCustomPrompt[];
}

const DEFAULT_SUBCLASS_LEVEL = 3;
const BASE_ABILITY_SCORE_LEVELS = new Set([4, 8, 12, 16, 19]);

const SUBCLASS_LEVELS: Record<string, number> = {
    Artificer: 3,
    Barbarian: 3,
    Bard: 3,
    Cleric: 1,
    Druid: 2,
    Fighter: 3,
    Monk: 3,
    Paladin: 3,
    Ranger: 3,
    Rogue: 3,
    Sorcerer: 1,
    Warlock: 3,
    Wizard: 2,
};

const CLASS_OVERRIDES: Record<
    string,
    {
        bonusAbilityScoreLevels?: number[];
        featLevels?: number[];
        subclassLevel?: number;
        prompts?: Record<number, LevelCustomPrompt[]>;
    }
> = {
    Fighter: {
        bonusAbilityScoreLevels: [6, 14],
        featLevels: [6, 14],
    },
    Rogue: {
        bonusAbilityScoreLevels: [10],
        featLevels: [10],
    },
    Cleric: {
        subclassLevel: 1,
    },
    Sorcerer: {
        subclassLevel: 1,
    },
    Wizard: {
        subclassLevel: 2,
    },
    Druid: {
        subclassLevel: 2,
    },
};

function getNormalizedClassName(className?: string | null) {
    return className?.trim() ?? "";
}

function getSubclassLevel(className?: string | null) {
    const normalized = getNormalizedClassName(className);
    return CLASS_OVERRIDES[normalized]?.subclassLevel ?? SUBCLASS_LEVELS[normalized] ?? DEFAULT_SUBCLASS_LEVEL;
}

function getAbilityScoreIncrementCount(className: string | null | undefined, level: number) {
    const normalized = getNormalizedClassName(className);
    const override = CLASS_OVERRIDES[normalized];
    const abilityLevels = new Set(BASE_ABILITY_SCORE_LEVELS);

    if (override?.bonusAbilityScoreLevels) {
        for (const lvl of override.bonusAbilityScoreLevels) {
            abilityLevels.add(lvl);
        }
    }

    return abilityLevels.has(level) ? 2 : 0;
}

function allowsFeatChoice(className: string | null | undefined, level: number) {
    const normalized = getNormalizedClassName(className);
    const override = CLASS_OVERRIDES[normalized];

    if (override?.featLevels?.includes(level)) {
        return true;
    }

    return BASE_ABILITY_SCORE_LEVELS.has(level);
}

export function getLevelRequirement(className: string | null | undefined, level: number): LevelRequirement {
    const subclassLevel = getSubclassLevel(className);
    const normalized = getNormalizedClassName(className);
    const abilityScoreIncrements = getAbilityScoreIncrementCount(className, level);
    const allowFeatChoice = allowsFeatChoice(className, level);
    const customPrompts = CLASS_OVERRIDES[normalized]?.prompts?.[level] ?? [];

    return {
        requiresSubclass: level === subclassLevel,
        abilityScoreIncrements,
        allowFeatChoice,
        customPrompts,
    };
}
