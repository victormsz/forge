import levelData from "@/db/2014/5e-SRD-Levels.json";

export interface ClassFeature {
    index: string;
    name: string;
    url: string;
}

export interface ClassReference {
    index: string;
    name: string;
    url: string;
}

export interface SubclassReference {
    index: string;
    name: string;
    url: string;
}

export interface SpellcastingInfo {
    cantrips_known?: number;
    spells_known?: number;
    spell_slots_level_1?: number;
    spell_slots_level_2?: number;
    spell_slots_level_3?: number;
    spell_slots_level_4?: number;
    spell_slots_level_5?: number;
    spell_slots_level_6?: number;
    spell_slots_level_7?: number;
    spell_slots_level_8?: number;
    spell_slots_level_9?: number;
}

export type ClassSpecificValue =
    | number
    | boolean
    | string
    | null
    | { dice_count: number; dice_value: number }
    | Record<string, unknown>
    | Array<unknown>;

export interface LevelData {
    level: number;
    ability_score_bonuses: number;
    prof_bonus: number;
    features: ClassFeature[];
    class_specific?: Record<string, ClassSpecificValue>;
    spellcasting?: SpellcastingInfo;
    class: ClassReference;
    subclass?: SubclassReference;
    index: string;
    url: string;
}

type LevelDataArray = LevelData[];

const typedLevelData = levelData as LevelDataArray;

/**
 * Get level information for a specific class and level
 */
export function getLevelData(className: string | null | undefined, level: number): LevelData | null {
    if (!className || level < 1 || level > 20) {
        return null;
    }

    const normalizedClassName = className.trim().toLowerCase();

    return typedLevelData.find(
        (data) =>
            data.class.name.toLowerCase() === normalizedClassName &&
            data.level === level &&
            !data.subclass
    ) ?? null;
}

/**
 * Get all level data for a specific class (levels 1-20)
 */
export function getClassLevelProgression(className: string | null | undefined): LevelData[] {
    if (!className) {
        return [];
    }

    const normalizedClassName = className.trim().toLowerCase();

    return typedLevelData
        .filter((data) =>
            data.class.name.toLowerCase() === normalizedClassName &&
            !data.subclass
        )
        .sort((a, b) => a.level - b.level);
}

/**
 * Get subclass level data
 */
export function getSubclassLevelData(
    className: string | null | undefined,
    subclassName: string | null | undefined,
    level: number
): LevelData | null {
    if (!className || !subclassName || level < 1 || level > 20) {
        return null;
    }

    const normalizedClassName = className.trim().toLowerCase();
    const normalizedSubclassName = subclassName.trim().toLowerCase();

    return typedLevelData.find(
        (data) =>
            data.class.name.toLowerCase() === normalizedClassName &&
            data.subclass?.name.toLowerCase() === normalizedSubclassName &&
            data.level === level
    ) ?? null;
}

/**
 * Get the level at which a class gains a subclass
 */
export function getSubclassLevel(className: string | null | undefined): number {
    if (!className) {
        return 3;
    }

    const normalizedClassName = className.trim().toLowerCase();

    // Find the first entry with a subclass for this class
    const subclassEntry = typedLevelData.find(
        (data) =>
            data.class.name.toLowerCase() === normalizedClassName &&
            data.subclass !== undefined
    );

    if (subclassEntry) {
        return subclassEntry.level;
    }

    // Check if any class level has a feature about choosing subclass
    const progression = getClassLevelProgression(className);
    for (const levelInfo of progression) {
        const hasSubclassFeature = levelInfo.features.some((feature) =>
            feature.name.toLowerCase().includes("path") ||
            feature.name.toLowerCase().includes("college") ||
            feature.name.toLowerCase().includes("domain") ||
            feature.name.toLowerCase().includes("circle") ||
            feature.name.toLowerCase().includes("archetype") ||
            feature.name.toLowerCase().includes("tradition") ||
            feature.name.toLowerCase().includes("patron") ||
            feature.name.toLowerCase().includes("bloodline") ||
            feature.name.toLowerCase().includes("origin")
        );

        if (hasSubclassFeature) {
            return levelInfo.level;
        }
    }

    return 3; // Default to 3 if not found
}

/**
 * Get proficiency bonus for a level
 */
export function getProficiencyBonus(level: number): number {
    if (level < 1) return 2;
    if (level <= 4) return 2;
    if (level <= 8) return 3;
    if (level <= 12) return 4;
    if (level <= 16) return 5;
    return 6;
}

/**
 * Get all available classes from the level data
 */
export function getAvailableClasses(): string[] {
    const classSet = new Set<string>();

    typedLevelData.forEach((data) => {
        classSet.add(data.class.name);
    });

    return Array.from(classSet).sort();
}

/**
 * Get all features for a class up to a specific level
 */
export function getFeaturesUpToLevel(className: string | null | undefined, level: number): ClassFeature[] {
    const progression = getClassLevelProgression(className);
    const features: ClassFeature[] = [];

    for (const levelInfo of progression) {
        if (levelInfo.level <= level) {
            features.push(...levelInfo.features);
        }
    }

    return features;
}

/**
 * Get all subclass features for a class up to a specific level
 */
export function getSubclassFeaturesUpToLevel(
    className: string | null | undefined,
    subclassName: string | null | undefined,
    level: number
): ClassFeature[] {
    if (!className || !subclassName) {
        return [];
    }

    const normalizedClassName = className.trim().toLowerCase();
    const normalizedSubclassName = subclassName.trim().toLowerCase();

    return typedLevelData
        .filter(
            (data) =>
                data.class.name.toLowerCase() === normalizedClassName &&
                data.subclass?.name.toLowerCase() === normalizedSubclassName &&
                data.level <= level
        )
        .sort((a, b) => a.level - b.level)
        .flatMap((data) => data.features);
}
