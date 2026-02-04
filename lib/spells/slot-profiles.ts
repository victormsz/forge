type SpellSlots = [number, number, number, number, number, number, number, number, number];

export interface SpellSlotSummary {
    variant: "standard" | "warlock" | "none";
    title: string;
    description: string;
    slots: Array<{ spellLevel: number; slots: number }>;
    pact?: { slots: number; spellLevel: number } | null;
    note?: string;
    emptyState: string;
}

type ProgressionType = "full" | "half" | "artificer" | "third" | "warlock" | "none";

const MAX_LEVEL = 20;

function slots(...values: number[]): SpellSlots {
    const filled = [...values];
    while (filled.length < 9) {
        filled.push(0);
    }
    return filled.slice(0, 9) as SpellSlots;
}

const ZERO_SLOTS = slots();

const FULL_CASTER_TABLE: SpellSlots[] = [
    slots(2),
    slots(3),
    slots(4, 2),
    slots(4, 3),
    slots(4, 3, 2),
    slots(4, 3, 3),
    slots(4, 3, 3, 1),
    slots(4, 3, 3, 2),
    slots(4, 3, 3, 3, 1),
    slots(4, 3, 3, 3, 2),
    slots(4, 3, 3, 3, 2, 1),
    slots(4, 3, 3, 3, 2, 1),
    slots(4, 3, 3, 3, 2, 1, 1),
    slots(4, 3, 3, 3, 2, 1, 1),
    slots(4, 3, 3, 3, 2, 1, 1, 1),
    slots(4, 3, 3, 3, 2, 1, 1, 1),
    slots(4, 3, 3, 3, 2, 1, 1, 1, 1),
    slots(4, 3, 3, 3, 2, 1, 1, 1, 1),
    slots(4, 3, 3, 3, 3, 2, 1, 1, 1),
    slots(4, 3, 3, 3, 3, 2, 2, 1, 1),
];

const HALF_CASTER_TABLE: SpellSlots[] = [
    slots(),
    slots(2),
    slots(3),
    slots(3),
    slots(4, 2),
    slots(4, 2),
    slots(4, 3),
    slots(4, 3),
    slots(4, 3, 2),
    slots(4, 3, 2),
    slots(4, 3, 3),
    slots(4, 3, 3),
    slots(4, 3, 3, 1),
    slots(4, 3, 3, 1),
    slots(4, 3, 3, 2),
    slots(4, 3, 3, 2),
    slots(4, 3, 3, 3, 1),
    slots(4, 3, 3, 3, 1),
    slots(4, 3, 3, 3, 2),
    slots(4, 3, 3, 3, 2),
];

const ARTIFICER_TABLE: SpellSlots[] = [
    slots(2),
    slots(2),
    slots(3),
    slots(3),
    slots(4, 2),
    slots(4, 2),
    slots(4, 3),
    slots(4, 3),
    slots(4, 3, 2),
    slots(4, 3, 2),
    slots(4, 3, 3),
    slots(4, 3, 3),
    slots(4, 3, 3, 1),
    slots(4, 3, 3, 1),
    slots(4, 3, 3, 2),
    slots(4, 3, 3, 2),
    slots(4, 3, 3, 3, 1),
    slots(4, 3, 3, 3, 1),
    slots(4, 3, 3, 3, 2),
    slots(4, 3, 3, 3, 2),
];

const THIRD_CASTER_TABLE: SpellSlots[] = [
    slots(),
    slots(),
    slots(2),
    slots(3),
    slots(3),
    slots(3),
    slots(4, 2),
    slots(4, 2),
    slots(4, 2),
    slots(4, 3),
    slots(4, 3),
    slots(4, 3),
    slots(4, 3, 2),
    slots(4, 3, 2),
    slots(4, 3, 2),
    slots(4, 3, 2),
    slots(4, 3, 3),
    slots(4, 3, 3),
    slots(4, 3, 3, 1),
    slots(4, 3, 3, 1),
];

type PactSlot = { slots: number; slotLevel: number };

const WARLOCK_PACT_TABLE: PactSlot[] = [
    { slots: 1, slotLevel: 1 },
    { slots: 2, slotLevel: 1 },
    { slots: 2, slotLevel: 2 },
    { slots: 2, slotLevel: 2 },
    { slots: 2, slotLevel: 3 },
    { slots: 2, slotLevel: 3 },
    { slots: 2, slotLevel: 4 },
    { slots: 2, slotLevel: 4 },
    { slots: 2, slotLevel: 5 },
    { slots: 2, slotLevel: 5 },
    { slots: 3, slotLevel: 5 },
    { slots: 3, slotLevel: 5 },
    { slots: 3, slotLevel: 6 },
    { slots: 3, slotLevel: 6 },
    { slots: 3, slotLevel: 7 },
    { slots: 3, slotLevel: 7 },
    { slots: 4, slotLevel: 8 },
    { slots: 4, slotLevel: 8 },
    { slots: 4, slotLevel: 9 },
    { slots: 4, slotLevel: 9 },
];

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

function buildStandardSummary(
    table: SpellSlots[],
    title: string,
    description: string,
    classLabel: string,
    level: number,
    firstSlotLevel: number,
    note?: string,
): SpellSlotSummary {
    const cappedLevel = clampLevel(level);
    const row = table[cappedLevel - 1] ?? ZERO_SLOTS;
    const slots = row
        .map((value, index) => ({ spellLevel: index + 1, slots: value }))
        .filter((entry) => entry.slots > 0);

    const unlockMessage = cappedLevel < firstSlotLevel
        ? `${classLabel} unlocks spell slots at level ${firstSlotLevel}.`
        : `${classLabel} does not have spell slots at this level.`;

    return {
        variant: "standard",
        title,
        description,
        slots,
        pact: null,
        note,
        emptyState: unlockMessage,
    };
}

function buildWarlockSummary(classLabel: string, level: number): SpellSlotSummary {
    const cappedLevel = clampLevel(level);
    const pact = WARLOCK_PACT_TABLE[cappedLevel - 1] ?? null;

    return {
        variant: "warlock",
        title: "Pact Magic slots",
        description: `${classLabel} uses Pact Magic slots that recharge on a short rest.`,
        slots: [],
        pact,
        note: "Mystic Arcanum spells are once-per-long-rest and should be tracked manually.",
        emptyState: `${classLabel} unlocks Pact Magic at level 1.`,
    };
}

export function getSpellSlotSummary(className: string | null | undefined, level: number): SpellSlotSummary {
    const progression = resolveProgression(className);
    const classLabel = className && className.trim().length > 0 ? className.trim() : "This class";

    switch (progression) {
        case "full":
            return buildStandardSummary(
                FULL_CASTER_TABLE,
                "Full caster progression",
                `${classLabel} follows the full-caster slot table (cleric, druid, sorcerer, wizard, bard).`,
                classLabel,
                level,
                PROGRESSION_FIRST_SLOT_LEVEL.full,
            );
        case "half":
            return buildStandardSummary(
                HALF_CASTER_TABLE,
                "Half caster progression",
                `${classLabel} uses the paladin/ranger slot progression (rounded down spellcaster level).`,
                classLabel,
                level,
                PROGRESSION_FIRST_SLOT_LEVEL.half,
            );
        case "artificer":
            return buildStandardSummary(
                ARTIFICER_TABLE,
                "Artificer progression",
                `${classLabel} gains spell slots early like the artificer spellcasting table.`,
                classLabel,
                level,
                PROGRESSION_FIRST_SLOT_LEVEL.artificer,
            );
        case "third":
            return buildStandardSummary(
                THIRD_CASTER_TABLE,
                "Third caster progression",
                `${classLabel} gains delayed slots similar to Eldritch Knights and Arcane Tricksters.`,
                classLabel,
                level,
                PROGRESSION_FIRST_SLOT_LEVEL.third,
            );
        case "warlock":
            return buildWarlockSummary(classLabel, level);
        default:
            return {
                variant: "none",
                title: "No spell slots",
                description: `${classLabel} does not gain spell slots by default.`,
                slots: [],
                pact: null,
                note: undefined,
                emptyState: `${classLabel} does not track spell slots.`,
            };
    }
}
