import { getLevelData, getSubclassLevel as getSubclassLevelFromData, type ClassFeature, type SpellcastingInfo } from "./level-data";

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
    features: ClassFeature[];
    proficiencyBonus: number;
    spellcasting?: SpellcastingInfo;
    classSpecific?: Record<string, any>;
}

/**
 * Determines if a feature represents an Ability Score Improvement
 */
function isAbilityScoreImprovement(feature: ClassFeature): boolean {
    return feature.name.toLowerCase().includes("ability score improvement");
}

export function getLevelRequirement(className: string | null | undefined, level: number): LevelRequirement {
    const levelData = getLevelData(className, level);
    const subclassLevel = getSubclassLevelFromData(className);

    if (!levelData) {
        // Fallback for missing data
        return {
            requiresSubclass: level === subclassLevel,
            abilityScoreIncrements: 0,
            allowFeatChoice: false,
            customPrompts: [],
            features: [],
            proficiencyBonus: 2,
        };
    }

    // Check if this level has an Ability Score Improvement feature
    const hasASI = levelData.features.some(isAbilityScoreImprovement);

    // ability_score_bonuses in the JSON represents how many ASI opportunities have been gained by this level
    // Each ASI grants 2 points to distribute (or can be swapped for a feat)
    const abilityScoreIncrements = hasASI ? 2 : 0;
    const allowFeatChoice = hasASI;

    return {
        requiresSubclass: level === subclassLevel,
        abilityScoreIncrements,
        allowFeatChoice,
        customPrompts: [],
        features: levelData.features,
        proficiencyBonus: levelData.prof_bonus,
        spellcasting: levelData.spellcasting,
        classSpecific: levelData.class_specific,
    };
}
