"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentActor } from "@/lib/current-actor";

import { AbilityGenerationMethod } from "@prisma/client";

import type { AbilityScores } from "@/lib/point-buy";
import {
    ABILITY_KEYS,
    DEFAULT_ABILITY_SCORES,
    MAX_ABILITY_SCORE,
    MIN_ABILITY_SCORE,
    POINT_BUY_BUDGET,
    RANDOM_MAX_ABILITY_SCORE,
    RANDOM_MIN_ABILITY_SCORE,
    calculatePointBuyCost,
} from "@/lib/point-buy";

import { MAX_CHARACTER_LEVEL } from "@/lib/characters/constants";
import { prisma } from "@/lib/prisma";

interface AbilityScoreBounds {
    min?: number;
    max?: number;
}

interface CharacterProficiencies {
    armor: string[];
    weapons: string[];
    tools: string[];
    skills: string[];
    languages: string[];
}

const EMPTY_PROFICIENCIES: CharacterProficiencies = {
    armor: [],
    weapons: [],
    tools: [],
    skills: [],
    languages: [],
};

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
                .map((entry) => entry.trim());
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

export async function createCharacter(formData: FormData) {
    const actor = await getCurrentActor();

    if (!actor) {
        throw new Error("Authentication required to create characters.");
    }

    if (actor.isGuest) {
        const existingCharacters = await prisma.character.count({ where: { userId: actor.userId } });

        if (existingCharacters >= 1) {
            throw new Error("Guest access supports only one character. Delete your current hero or sign in to add more.");
        }
    }

    const nameInput = formData.get("name");
    const methodInput = formData.get("method");
    const ancestryInput = formData.get("ancestry");
    const classInput = formData.get("class");
    const backgroundInput = formData.get("background");
    const alignmentInput = formData.get("alignment");
    const abilityScoresInput = formData.get("abilityScores");
    const proficienciesInput = formData.get("proficiencies");
    const name = typeof nameInput === "string" && nameInput.trim().length > 0 ? nameInput.trim() : "New Adventurer";

    const allowedMethods = new Set<AbilityGenerationMethod>([
        AbilityGenerationMethod.POINT_BUY,
        AbilityGenerationMethod.RANDOM,
    ]);

    const generationMethod = allowedMethods.has(methodInput as AbilityGenerationMethod)
        ? (methodInput as AbilityGenerationMethod)
        : AbilityGenerationMethod.POINT_BUY;

    const ancestry = typeof ancestryInput === "string" && ancestryInput.trim().length > 0 ? ancestryInput.trim() : null;
    const charClass = typeof classInput === "string" && classInput.trim().length > 0 ? classInput.trim() : null;
    const background = typeof backgroundInput === "string" && backgroundInput.trim().length > 0 ? backgroundInput.trim() : null;
    const alignment = typeof alignmentInput === "string" && alignmentInput.trim().length > 0 ? alignmentInput.trim() : null;
    const abilityScores = parseAbilityScores(
        abilityScoresInput,
        generationMethod === AbilityGenerationMethod.RANDOM
            ? { min: RANDOM_MIN_ABILITY_SCORE, max: RANDOM_MAX_ABILITY_SCORE }
            : { min: MIN_ABILITY_SCORE, max: MAX_ABILITY_SCORE },
    );
    const proficiencies = parseProficiencies(proficienciesInput);

    if (generationMethod === AbilityGenerationMethod.POINT_BUY) {
        const totalCost = calculatePointBuyCost(abilityScores);

        if (totalCost > POINT_BUY_BUDGET) {
            throw new Error("Point buy exceeds the 27-point budget.");
        }
    }

    if (!ancestry || !charClass || !background || !alignment) {
        throw new Error("Select ancestry, class, background, and alignment to forge a hero.");
    }

    await prisma.character.create({
        data: {
            name,
            userId: actor.userId,
            generationMethod,
            abilityScores,
            ancestry,
            charClass,
            background,
            alignment,
            proficiencies,
        },
    });

    revalidatePath("/characters");
    redirect("/characters");
}

export async function deleteCharacter(formData: FormData) {
    const actor = await getCurrentActor();

    if (!actor) {
        throw new Error("Authentication required to delete characters.");
    }

    const characterIdInput = formData.get("characterId");
    const characterId = typeof characterIdInput === "string" ? characterIdInput : null;

    if (!characterId) {
        throw new Error("Character id missing.");
    }

    const existing = await prisma.character.findUnique({ where: { id: characterId } });

    if (!existing || existing.userId !== actor.userId) {
        throw new Error("Character not found or access denied.");
    }

    await prisma.character.delete({ where: { id: characterId } });
    revalidatePath("/characters");
}

export async function levelUpCharacter(formData: FormData) {
    const actor = await getCurrentActor();

    if (!actor) {
        throw new Error("Authentication required to level up characters.");
    }

    if (actor.isGuest) {
        throw new Error("Guest access cannot level up characters.");
    }

    const characterIdInput = formData.get("characterId");
    const characterId = typeof characterIdInput === "string" ? characterIdInput : null;

    if (!characterId) {
        throw new Error("Character id missing.");
    }

    const existing = await prisma.character.findUnique({
        where: { id: characterId },
        select: { userId: true, level: true },
    });

    if (!existing || existing.userId !== actor.userId) {
        throw new Error("Character not found or access denied.");
    }

    const nextLevel = Math.min(MAX_CHARACTER_LEVEL, existing.level + 1);

    if (nextLevel === existing.level) {
        return;
    }

    await prisma.character.update({ where: { id: characterId }, data: { level: nextLevel } });
    revalidatePath("/characters");
}
