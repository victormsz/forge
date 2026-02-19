import { AbilityGenerationMethod, SpellTargetAffinity, SpellTargetShape } from "@prisma/client";

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

import { normalizeCustomStats } from "@/lib/items/custom-stats";

import {
    type AbilityIncreaseChoice,
    EMPTY_PROFICIENCIES,
    type CharacterProficiencies,
    type CreateCharacterInput,
    type LevelUpInput,
    type AddSpellInput,
    type ToggleSpellPreparationInput,
    type AddItemInput,
    type EquipItemInput,
    type EquipmentSlot,
} from "@/lib/characters/types";
import { parseCustomSubclassJson, type CustomSubclassJsonInput } from "@/lib/classes/custom-subclass";

const allowedMethods = new Set<AbilityGenerationMethod>([AbilityGenerationMethod.POINT_BUY, AbilityGenerationMethod.RANDOM]);
const allowedShapes = new Set<SpellTargetShape>(Object.values(SpellTargetShape));
const allowedAffinities = new Set<SpellTargetAffinity>(Object.values(SpellTargetAffinity));
const allowedEquipmentSlots = new Set<EquipmentSlot>(["MAIN_HAND", "OFF_HAND", "ARMOR", "SHIELD"]);

export const HIT_DICE_ROLL_REQUIRED_MESSAGE = "Roll your hit die before applying this level up.";

export class MissingHitDiceRollError extends Error {
    constructor() {
        super(HIT_DICE_ROLL_REQUIRED_MESSAGE);
        this.name = "MissingHitDiceRollError";
    }
}

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

function readBoolean(value: FormDataEntryValue | null, fallback = false) {
    if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();
        if (normalized === "true" || normalized === "1" || normalized === "yes") {
            return true;
        }
        if (normalized === "false" || normalized === "0" || normalized === "no") {
            return false;
        }
    }
    if (typeof value === "number") {
        return value !== 0;
    }
    if (typeof value === "boolean") {
        return value;
    }
    return fallback;
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

function parsePositiveInteger(input: FormDataEntryValue | null) {
    if (typeof input !== "string") {
        return null;
    }
    const value = Number(input);
    if (!Number.isFinite(value)) {
        return null;
    }
    const integer = Math.trunc(value);
    return integer > 0 ? integer : null;
}

function parseSpellLevel(input: FormDataEntryValue | null) {
    if (typeof input !== "string" && typeof input !== "number") {
        return 0;
    }
    const numeric = typeof input === "number" ? input : Number(input);
    if (!Number.isFinite(numeric)) {
        return 0;
    }
    return Math.min(9, Math.max(0, Math.trunc(numeric)));
}

function parseSpellShape(input: FormDataEntryValue | null): SpellTargetShape {
    if (typeof input === "string" && allowedShapes.has(input as SpellTargetShape)) {
        return input as SpellTargetShape;
    }
    return SpellTargetShape.SINGLE;
}

function parseSpellAffinity(input: FormDataEntryValue | null): SpellTargetAffinity {
    if (typeof input === "string" && allowedAffinities.has(input as SpellTargetAffinity)) {
        return input as SpellTargetAffinity;
    }
    return SpellTargetAffinity.HOSTILE;
}

function parseWeightValue(input: FormDataEntryValue | null) {
    if (typeof input === "number") {
        return clampWeight(input);
    }
    if (typeof input === "string" && input.trim().length > 0) {
        const numeric = Number(input);
        if (Number.isFinite(numeric)) {
            return clampWeight(numeric);
        }
    }
    return null;
}

function clampWeight(value: number) {
    if (!Number.isFinite(value)) {
        return null;
    }
    const bounded = Math.min(1000, Math.max(0, value));
    return Math.round(bounded * 100) / 100;
}

function parseQuantityValue(input: FormDataEntryValue | null) {
    if (typeof input === "number") {
        return clampQuantity(input);
    }
    if (typeof input === "string" && input.trim().length > 0) {
        const numeric = Number(input);
        if (Number.isFinite(numeric)) {
            return clampQuantity(numeric);
        }
    }
    return 1;
}

function clampQuantity(value: number) {
    if (!Number.isFinite(value)) {
        return 1;
    }
    const integer = Math.trunc(value);
    return Math.min(999, Math.max(1, integer));
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

    // Parse equipment choices
    let equipmentChoices: Record<number, number> = {};
    const equipmentChoicesInput = formData.get("equipmentChoices");
    if (equipmentChoicesInput && typeof equipmentChoicesInput === "string") {
        try {
            const parsed = JSON.parse(equipmentChoicesInput);
            if (parsed && typeof parsed === "object") {
                equipmentChoices = parsed;
            }
        } catch {
            // If parsing fails, just use empty object
        }
    }

    // Parse ancestry ability choices (for Half-Elf +1 bonuses)
    let ancestryAbilityChoices: Partial<Record<AbilityKey, number>> = {};
    const ancestryChoicesInput = formData.get("ancestryAbilityChoices");
    if (ancestryChoicesInput && typeof ancestryChoicesInput === "string") {
        try {
            const parsed = JSON.parse(ancestryChoicesInput);
            if (parsed && typeof parsed === "object") {
                ancestryAbilityChoices = parsed;
            }
        } catch {
            // If parsing fails, just use empty object
        }
    }

    // Parse background ability choice
    const backgroundChoice = readString(formData.get("backgroundAbilityChoice"));
    const backgroundAbilityChoice = backgroundChoice && ABILITY_KEYS.includes(backgroundChoice as AbilityKey)
        ? (backgroundChoice as AbilityKey)
        : null;

    // Parse custom subclass if present
    let customSubclass = undefined;
    const customSubclassInput = formData.get("selectedCustomSubclass");
    if (customSubclassInput && typeof customSubclassInput === "string") {
        const parsed = parseCustomSubclassJson(customSubclassInput);
        if (parsed) {
            customSubclass = parsed;
        }
    }

    return {
        name: readString(formData.get("name"), "New Adventurer", 120)!,
        generationMethod,
        ancestry: readString(formData.get("ancestry")),
        charClass: readString(formData.get("class")),
        background: readString(formData.get("background")),
        alignment: readString(formData.get("alignment")),
        abilityScores,
        proficiencies: parseProficiencies(formData.get("proficiencies")),
        equipmentChoices,
        ancestryAbilityChoices,
        backgroundAbilityChoice,
        customSubclass,
    };
}

export function parseEquipItemFormData(formData: FormData): EquipItemInput {
    const characterId = readString(formData.get("characterId"));
    const itemId = readString(formData.get("itemId"));
    if (!characterId || !itemId) {
        throw new Error("Missing character or item id.");
    }

    const slotValue = readString(formData.get("slot"));
    const slot = slotValue && allowedEquipmentSlots.has(slotValue as EquipmentSlot)
        ? (slotValue as EquipmentSlot)
        : null;

    return { characterId, itemId, slot };
}

export function parseLevelUpFormData(formData: FormData): LevelUpInput {
    const characterId = readString(formData.get("characterId"));

    if (!characterId) {
        throw new Error("Character id missing.");
    }

    const abilityIncreaseInputs = formData
        .getAll("abilityIncreases")
        .filter((value) => value !== null && value !== undefined);

    if (abilityIncreaseInputs.length === 0) {
        abilityIncreaseInputs.push(formData.get("abilityIncreasePrimary"), formData.get("abilityIncreaseSecondary"));
    }

    const abilityIncreases = abilityIncreaseInputs
        .map((value) => parseAbilityIncreaseChoice(value))
        .filter((choice): choice is AbilityIncreaseChoice => Boolean(choice));

    const hitDiceRoll = parsePositiveInteger(formData.get("hitDiceRoll"));

    if (hitDiceRoll === null) {
        throw new MissingHitDiceRollError();
    }

    return {
        characterId,
        subclass: readString(formData.get("subclass")),
        feat: readString(formData.get("feat")),
        abilityIncreases,
        notes: readString(formData.get("notes"), null, 800),
        hitDiceRoll,
    };
}

export function parseAddSpellFormData(formData: FormData): AddSpellInput {
    const characterId = readString(formData.get("characterId"));
    const name = readString(formData.get("name"));

    if (!characterId) {
        throw new Error("Character id missing.");
    }

    if (!name) {
        throw new Error("Spell name is required.");
    }

    return {
        characterId,
        name,
        level: parseSpellLevel(formData.get("level")),
        shape: parseSpellShape(formData.get("shape")),
        affinity: parseSpellAffinity(formData.get("affinity")),
        range: readString(formData.get("range"), "Self", 120),
        school: readString(formData.get("school"), null, 120),
        description: readString(formData.get("description"), null, 2000),
        damage: readString(formData.get("damage"), null, 120),
        referenceId: readString(formData.get("referenceId")),
        isCustom: readBoolean(formData.get("isCustom"), false),
    };
}

export function parseDeleteSpellFormData(formData: FormData) {
    const spellId = readString(formData.get("spellId"));
    if (!spellId) {
        throw new Error("Spell id missing.");
    }
    return {
        spellId,
        characterId: readString(formData.get("characterId")),
    };
}

export function parseToggleSpellPreparationFormData(formData: FormData): ToggleSpellPreparationInput {
    const spellId = readString(formData.get("spellId"));
    const characterId = readString(formData.get("characterId"));

    if (!spellId || !characterId) {
        throw new Error("Spell context missing.");
    }

    return {
        spellId,
        characterId,
        isPrepared: readBoolean(formData.get("isPrepared"), false),
    };
}

export function parseAddItemFormData(formData: FormData): AddItemInput {
    const characterId = readString(formData.get("characterId"));
    const name = readString(formData.get("name"));

    if (!characterId) {
        throw new Error("Character id missing.");
    }

    if (!name) {
        throw new Error("Item name is required.");
    }

    const customStatsJson = readString(formData.get("customStats"), null);
    let customStats = null;
    if (customStatsJson) {
        try {
            const parsed = JSON.parse(customStatsJson);
            customStats = normalizeCustomStats(parsed);
        } catch {
            // Invalid JSON, ignore custom stats
            customStats = null;
        }
    }

    return {
        characterId,
        name,
        category: readString(formData.get("category"), null, 120),
        cost: readString(formData.get("cost"), null, 120),
        weight: parseWeightValue(formData.get("weight")),
        quantity: parseQuantityValue(formData.get("quantity")),
        description: readString(formData.get("description"), null, 2000),
        notes: readString(formData.get("notes"), null, 800),
        referenceId: readString(formData.get("referenceId")),
        isCustom: readBoolean(formData.get("isCustom"), false),
        customStats,
    };
}

export function parseDeleteItemFormData(formData: FormData) {
    const itemId = readString(formData.get("itemId"));
    if (!itemId) {
        throw new Error("Item id missing.");
    }
    return {
        itemId,
        characterId: readString(formData.get("characterId")),
    };
}

export function assertPointBuyWithinBudget(scores: AbilityScores) {
    const totalCost = calculatePointBuyCost(scores);
    if (totalCost > POINT_BUY_BUDGET) {
        throw new Error("Point buy exceeds the allowed budget.");
    }
}
