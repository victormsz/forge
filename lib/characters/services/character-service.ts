import { AbilityGenerationMethod } from "@prisma/client";

import { MAX_CHARACTER_LEVEL } from "@/lib/characters/constants";
import { getHitDieValue } from "@/lib/characters/hit-dice";
import type {
    LevelUpInput,
    CreateCharacterInput,
    LevelUpChoicesMeta,
    AddSpellInput,
    ToggleSpellPreparationInput,
} from "@/lib/characters/types";
import { assertPointBuyWithinBudget } from "@/lib/characters/form-parsers";
import { getLevelRequirement } from "@/lib/characters/leveling/level-requirements";
import type { CurrentActor } from "@/lib/current-actor";
import { prisma } from "@/lib/prisma";
import { findReferenceSpellById, spellSupportsClass } from "@/lib/spells/reference";
import { getSpellPreparationProfile } from "@/lib/spells/class-preparation";

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
            select: { id: true, userId: true, level: true, charClass: true },
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

        const requirements = getLevelRequirement(existing.charClass, nextLevel);

        if (requirements.requiresSubclass && !input.subclass) {
            throw new Error("Subclass selection is required at this level.");
        }

        if (requirements.abilityScoreIncrements === 0 && input.abilityIncreases.length > 0) {
            throw new Error("Ability score improvements are not unlocked at this level.");
        }

        if (requirements.abilityScoreIncrements > 0 && input.abilityIncreases.length !== requirements.abilityScoreIncrements) {
            throw new Error(`Select ${requirements.abilityScoreIncrements} ability score increases for this level.`);
        }

        const hitDieValue = getHitDieValue(existing.charClass);

        if (typeof input.hitDiceRoll !== "number" || input.hitDiceRoll < 1 || input.hitDiceRoll > hitDieValue) {
            throw new Error(`Roll your d${hitDieValue} hit die before applying this level up.`);
        }

        const abilityIncreases = requirements.abilityScoreIncrements > 0
            ? input.abilityIncreases.slice(0, requirements.abilityScoreIncrements)
            : [];
        const featChoice = requirements.allowFeatChoice ? input.feat ?? null : null;
        const subclassChoice = input.subclass ?? null;

        const levelUpChoices: LevelUpChoicesMeta = {
            ...input,
            abilityIncreases,
            feat: featChoice,
            subclass: subclassChoice,
            fromLevel: existing.level,
            toLevel: nextLevel,
            appliedAt: new Date().toISOString(),
        };

        await prisma.character.update({ where: { id: input.characterId }, data: { level: nextLevel, levelUpChoices } });
        return { updated: true, level: nextLevel };
    }

    async addSpell(input: AddSpellInput) {
        if (this.actor.isGuest) {
            throw new Error("Sign in to track spells.");
        }

        const character = await this.requireCharacter(input.characterId);

        let spellName = input.name;
        let spellLevel = input.level;
        let spellRange = input.range ?? "Self";
        let spellSchool = input.school;
        let spellDescription = input.description;
        const prepProfile = getSpellPreparationProfile(character.charClass);
        const autoPrepared = prepProfile.mode !== "PREPARES_DAILY";

        if (!input.isCustom) {
            if (!input.referenceId) {
                throw new Error("Select a spell from the SRD list or convert it to a custom entry.");
            }

            const reference = findReferenceSpellById(input.referenceId);

            if (!reference) {
                throw new Error("The selected spell could not be found. Refresh the library and try again.");
            }

            if (!spellSupportsClass(reference, character.charClass)) {
                throw new Error(`${character.charClass ?? "This class"} cannot prepare ${reference.name}. Use the custom option if you need an exception.`);
            }

            spellName = reference.name;
            spellLevel = reference.level;
            spellRange = reference.range ?? "Self";
            spellSchool = reference.school;
            spellDescription = reference.description;
        }

        await prisma.spell.create({
            data: {
                characterId: character.id,
                name: spellName,
                level: spellLevel,
                shape: input.shape,
                affinity: input.affinity,
                range: spellRange,
                school: spellSchool,
                description: spellDescription,
                damage: input.damage,
                isCustom: input.isCustom,
                isPrepared: autoPrepared,
            },
        });

        return character.id;
    }

    async deleteSpell(spellId: string) {
        if (this.actor.isGuest) {
            throw new Error("Guest access cannot modify spells.");
        }

        const spell = await prisma.spell.findUnique({
            where: { id: spellId },
            select: {
                id: true,
                characterId: true,
                character: { select: { userId: true } },
            },
        });

        if (!spell) {
            throw new Error("Spell not found or access denied.");
        }

        this.ensureOwnership(spell.character.userId);
        await prisma.spell.delete({ where: { id: spellId } });
        return spell.characterId;
    }

    async toggleSpellPreparation(input: ToggleSpellPreparationInput) {
        if (this.actor.isGuest) {
            throw new Error("Guest access cannot modify spells.");
        }

        const spell = await prisma.spell.findUnique({
            where: { id: input.spellId },
            select: {
                id: true,
                characterId: true,
                character: {
                    select: {
                        userId: true,
                        charClass: true,
                    },
                },
            },
        });

        if (!spell) {
            throw new Error("Spell not found or access denied.");
        }

        this.ensureOwnership(spell.character.userId);

        const profile = getSpellPreparationProfile(spell.character.charClass);

        if (profile.mode !== "PREPARES_DAILY") {
            throw new Error("This class does not track prepared spells. Every known spell is already ready to cast.");
        }

        await prisma.spell.update({ where: { id: input.spellId }, data: { isPrepared: input.isPrepared } });
        return spell.characterId;
    }
}
