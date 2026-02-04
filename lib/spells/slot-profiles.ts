import { getLevelData, type SpellcastingInfo } from "@/lib/characters/leveling/level-data";

type SpellSlots = [number, number, number, number, number, number, number, number, number];

export interface SpellSlotSummary {
    variant: "standard" | "warlock" | "none";
    title: string;
    description: string;
    slots: Array<{ spellLevel: number; slots: number }>;
    pact?: { slots: number; spellLevel: number } | null;
    note?: string;
    emptyState: string;
    maxSpellLevel: number;
    cantripsKnown?: number;
    spellsKnown?: number;
}

type ProgressionType = "full" | "half" | "artificer" | "third" | "warlock" | "none";

const MAX_LEVEL = 20;

const ZERO_SLOTS: SpellSlots = [0, 0, 0, 0, 0, 0, 0, 0, 0];

type PactSlot = { slots: number; slotLevel: number };

const CLASS_PROGRESSIONS: Record<string, ProgressionType> = {
    bard: "full",
    cleric: "full",
    druid: "full",
    sorcerer: "full",
    wizard: "full",
    artificer: "artificer",
    paladin: "half",
    ranger: "half",
    warlock: "warlock",
    "eldritch knight": "third",
    "arcane trickster": "third",
};

const PROGRESSION_FIRST_SLOT_LEVEL: Record<ProgressionType, number> = {
    full: 1,
    half: 2,
    artificer: 1,
    third: 3,
    warlock: 1,
    none: Infinity,
};

function clampLevel(level: number) {
    if (!Number.isFinite(level)) {
        return 1;
    }
    return Math.min(Math.max(Math.trunc(level), 1), MAX_LEVEL);
}

function normalizeClassName(className: string | null | undefined) {
    if (!className) {
        return "";
    }
    return className.trim().toLowerCase();
}

function resolveProgression(className: string | null | undefined): ProgressionType {
    const normalized = normalizeClassName(className);
    if (!normalized) {
        return "none";
    }

    if (CLASS_PROGRESSIONS[normalized]) {
        return CLASS_PROGRESSIONS[normalized];
    }

    for (const [key, value] of Object.entries(CLASS_PROGRESSIONS)) {
        if (normalized.includes(key)) {
            return value;
        }
    }

    return "none";
}

/**
 * Convert SpellcastingInfo from JSON to SpellSlots array
 */
function spellcastingToSlots(spellcasting: SpellcastingInfo | undefined): SpellSlots {
    if (!spellcasting) {
        return ZERO_SLOTS;
    }

    return [
        spellcasting.spell_slots_level_1 ?? 0,
        spellcasting.spell_slots_level_2 ?? 0,
        spellcasting.spell_slots_level_3 ?? 0,
        spellcasting.spell_slots_level_4 ?? 0,
        spellcasting.spell_slots_level_5 ?? 0,
        spellcasting.spell_slots_level_6 ?? 0,
        spellcasting.spell_slots_level_7 ?? 0,
        spellcasting.spell_slots_level_8 ?? 0,
        spellcasting.spell_slots_level_9 ?? 0,
    ];
}

/**
 * Get spell slots from JSON data for a specific class and level
 */
function getJsonSpellSlots(className: string | null | undefined, level: number): SpellSlots {
    const levelData = getLevelData(className, level);
    return spellcastingToSlots(levelData?.spellcasting);
}

/**
 * Check if a class uses Warlock pact magic based on JSON data
 */
function isWarlockPactMagic(className: string | null | undefined): boolean {
    const normalized = normalizeClassName(className);
    return normalized === "warlock";
}

/**
 * Get pact magic slot information for Warlock from JSON
 */
function getPactMagicFromJson(className: string | null | undefined, level: number): PactSlot | null {
    if (!isWarlockPactMagic(className)) {
        return null;
    }

    const levelData = getLevelData(className, level);
    const spellcasting = levelData?.spellcasting;

    if (!spellcasting) {
        return null;
    }

    // Find the highest spell slot level available
    for (let i = 9; i >= 1; i--) {
        const key = `spell_slots_level_${i}` as keyof SpellcastingInfo;
        const slots = spellcasting[key];
        if (slots && slots > 0) {
            return { slots, slotLevel: i };
        }
    }

    return null;
}

function buildStandardSummary(
    title: string,
    description: string,
    classLabel: string,
    level: number,
    firstSlotLevel: number,
    slots: SpellSlots,
    cantripsKnown?: number,
    spellsKnown?: number,
    note?: string,
): SpellSlotSummary {
    const slotArray = slots
        .map((value, index) => ({ spellLevel: index + 1, slots: value }))
        .filter((entry) => entry.slots > 0);
    const maxSpellLevel = slotArray.length > 0 ? slotArray[slotArray.length - 1].spellLevel : 0;

    const cappedLevel = clampLevel(level);
    const unlockMessage = cappedLevel < firstSlotLevel
        ? `${classLabel} unlocks spell slots at level ${firstSlotLevel}.`
        : `${classLabel} does not have spell slots at this level.`;

    return {
        variant: "standard",
        title,
        description,
        slots: slotArray,
        pact: null,
        note,
        emptyState: unlockMessage,
        maxSpellLevel,
        cantripsKnown,
        spellsKnown,
    };
}

function buildWarlockSummary(classLabel: string, level: number): SpellSlotSummary {
    const pact = getPactMagicFromJson(classLabel, level);
    const maxSpellLevel = pact?.slotLevel ?? 0;
    const levelData = getLevelData(classLabel, level);

    return {
        variant: "warlock",
        title: "Pact Magic slots",
        description: `${classLabel} uses Pact Magic slots that recharge on a short rest.`,
        slots: [],
        pact,
        note: "Mystic Arcanum spells are once-per-long-rest and should be tracked manually.",
        emptyState: `${classLabel} unlocks Pact Magic at level 1.`,
        maxSpellLevel,
        cantripsKnown: levelData?.spellcasting?.cantrips_known,
        spellsKnown: levelData?.spellcasting?.spells_known,
    };
}

export function getSpellSlotSummary(className: string | null | undefined, level: number): SpellSlotSummary {
    const progression = resolveProgression(className);
    const classLabel = className && className.trim().length > 0 ? className.trim() : "This class";

    // For Warlock, use pact magic
    if (progression === "warlock") {
        return buildWarlockSummary(classLabel, level);
    }

    // For all other classes, get slots from JSON
    const slots = getJsonSpellSlots(className, level);
    const levelData = getLevelData(className, level);
    const hasAnySlots = slots.some(s => s > 0);

    if (!hasAnySlots && progression === "none") {
        return {
            variant: "none",
            title: "No spell slots",
            description: `${classLabel} does not gain spell slots by default.`,
            slots: [],
            pact: null,
            note: undefined,
            emptyState: `${classLabel} does not track spell slots.`,
            maxSpellLevel: 0,
        };
    }

    // Determine the description based on progression type
    let title = "Spell slots";
    let description = `${classLabel} spell slot progression.`;

    switch (progression) {
        case "full":
            title = "Full caster progression";
            description = `${classLabel} follows the full-caster slot table (cleric, druid, sorcerer, wizard, bard).`;
            break;
        case "half":
            title = "Half caster progression";
            description = `${classLabel} uses the paladin/ranger slot progression (rounded down spellcaster level).`;
            break;
        case "artificer":
            title = "Artificer progression";
            description = `${classLabel} gains spell slots early like the artificer spellcasting table.`;
            break;
        case "third":
            title = "Third caster progression";
            description = `${classLabel} gains delayed slots similar to Eldritch Knights and Arcane Tricksters.`;
            break;
    }

    return buildStandardSummary(
        title,
        description,
        classLabel,
        level,
        PROGRESSION_FIRST_SLOT_LEVEL[progression],
        slots,
        levelData?.spellcasting?.cantrips_known,
        levelData?.spellcasting?.spells_known,
    );
}
