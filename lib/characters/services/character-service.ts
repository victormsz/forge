import { AbilityGenerationMethod } from "@prisma/client";

import { MAX_CHARACTER_LEVEL } from "@/lib/characters/constants";
import type { LevelUpInput, CreateCharacterInput, LevelUpChoicesMeta } from "@/lib/characters/types";
import { assertPointBuyWithinBudget } from "@/lib/characters/form-parsers";
import type { CurrentActor } from "@/lib/current-actor";
import { prisma } from "@/lib/prisma";

export class CharacterService {
    constructor(private readonly actor: CurrentActor) {
        if (!actor) {
            throw new Error("Authentication required.");
        }
    }

    private ensureOwnership(userId: string) {
        if (userId !== this.actor.userId) {
            throw new Error("Character not found or access denied.");
        }
    }

    private async requireCharacter(characterId: string) {
        const character = await prisma.character.findUnique({
            where: { id: characterId },
            select: { id: true, userId: true, level: true },
        });

        if (!character) {
            throw new Error("Character not found or access denied.");
        }

        this.ensureOwnership(character.userId);
        return character;
    }

    async createCharacter(input: CreateCharacterInput) {
        if (!input.ancestry || !input.charClass || !input.background || !input.alignment) {
            throw new Error("Select ancestry, class, background, and alignment to forge a hero.");
        }

        if (this.actor.isGuest) {
            const existingCharacters = await prisma.character.count({ where: { userId: this.actor.userId } });
            if (existingCharacters >= 1) {
                throw new Error("Guest access supports only one character. Delete your current hero or sign in to add more.");
            }
        }

        if (input.generationMethod === AbilityGenerationMethod.POINT_BUY) {
            assertPointBuyWithinBudget(input.abilityScores);
        }

        await prisma.character.create({
            data: {
                name: input.name,
                userId: this.actor.userId,
                generationMethod: input.generationMethod,
                abilityScores: input.abilityScores,
                ancestry: input.ancestry,
                charClass: input.charClass,
                background: input.background,
                alignment: input.alignment,
                proficiencies: input.proficiencies,
            },
        });
    }

    async deleteCharacter(characterId: string) {
        const character = await prisma.character.findUnique({ where: { id: characterId }, select: { userId: true, id: true } });

        if (!character) {
            throw new Error("Character not found or access denied.");
        }

        this.ensureOwnership(character.userId);
        await prisma.character.delete({ where: { id: characterId } });
    }

    async levelUp(input: LevelUpInput) {
        if (this.actor.isGuest) {
            throw new Error("Guest access cannot level up characters.");
        }

        const existing = await this.requireCharacter(input.characterId);
        const nextLevel = Math.min(MAX_CHARACTER_LEVEL, existing.level + 1);

        if (nextLevel === existing.level) {
            return { updated: false, level: existing.level };
        }

        const levelUpChoices: LevelUpChoicesMeta = {
            ...input,
            fromLevel: existing.level,
            toLevel: nextLevel,
            appliedAt: new Date().toISOString(),
        };

        await prisma.character.update({ where: { id: input.characterId }, data: { level: nextLevel, levelUpChoices } });
        return { updated: true, level: nextLevel };
    }
}
