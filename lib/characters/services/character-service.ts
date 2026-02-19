import { AbilityGenerationMethod } from "@prisma/client";

import { MAX_CHARACTER_LEVEL } from "@/lib/characters/constants";
import { getHitDieValue } from "@/lib/characters/hit-dice";
import type {
    LevelUpInput,
    CreateCharacterInput,
    LevelUpChoicesMeta,
    AddSpellInput,
    ToggleSpellPreparationInput,
    AddItemInput,
    EquipItemInput,
} from "@/lib/characters/types";
import { assertPointBuyWithinBudget } from "@/lib/characters/form-parsers";
import { getLevelRequirement } from "@/lib/characters/leveling/level-requirements";
import type { CurrentActor } from "@/lib/current-actor";
import { prisma } from "@/lib/prisma";
import { findReferenceItemById } from "@/lib/items/reference";
import { normalizeCustomStats } from "@/lib/items/custom-stats";
import { findReferenceSpellById, spellSupportsClass } from "@/lib/spells/reference";
import { getSpellPreparationProfile } from "@/lib/spells/class-preparation";
import { getSpellSlotSummary } from "@/lib/spells/slot-profiles";
import { ABILITY_KEYS, DEFAULT_ABILITY_SCORES, type AbilityKey } from "@/lib/point-buy";
import { applyAncestryBonuses } from "@/lib/characters/ancestry-bonuses";
import { applyBackgroundBonus } from "@/lib/characters/background-bonuses";
import { getClassOptions, type EquipmentReference } from "@/lib/classes/load-classes";

const SLOT_ORDINALS = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th"] as const;
const MAX_LEVEL_UP_ABILITY_SCORE = 20;

function formatSpellLevelLabel(level: number) {
    if (level <= 0) {
        return "cantrips";
    }
    const ordinal = SLOT_ORDINALS[level - 1] ?? `${level}th`;
    return `${ordinal}-level`;
}

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
            select: { id: true, userId: true, level: true, charClass: true, subclass: true, abilityScores: true },
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

        if (this.actor.role === "guest") {
            const existingCharacters = await prisma.character.count({ where: { userId: this.actor.userId } });
            if (existingCharacters >= 1) {
                throw new Error("Guest access supports only one character. Delete your current hero or sign in to add more.");
            }
        }

        if (input.generationMethod === AbilityGenerationMethod.POINT_BUY) {
            assertPointBuyWithinBudget(input.abilityScores);
        }

        // Apply racial/ancestry bonuses to ability scores
        let finalAbilityScores = applyAncestryBonuses(
            input.abilityScores,
            input.ancestry,
            input.ancestryAbilityChoices
        );

        // Apply background ability bonus
        finalAbilityScores = applyBackgroundBonus(
            finalAbilityScores,
            input.background,
            input.backgroundAbilityChoice ?? null
        );

        // Load class data to get starting equipment
        const classOptions = getClassOptions();
        const classData = classOptions.find((c) => c.value === input.charClass);

        // Build starting equipment list
        const startingItems: Array<{ name: string; quantity: number }> = [];

        if (classData) {
            // Add automatic starting equipment
            classData.startingEquipment.forEach((item) => {
                startingItems.push({
                    name: item.equipment.name,
                    quantity: item.quantity,
                });
            });

            // Add selected equipment from choices
            const equipmentOptions = classData.startingEquipmentOptions || [];
            Object.entries(input.equipmentChoices).forEach(([optionIndexStr, choiceIndex]) => {
                const optionIndex = parseInt(optionIndexStr, 10);
                const equipmentOption = equipmentOptions[optionIndex];

                if (equipmentOption?.from?.options) {
                    const selectedChoice = equipmentOption.from.options[choiceIndex];

                    if (selectedChoice) {
                        // Handle different option types
                        if (selectedChoice.option_type === "counted_reference") {
                            const count = selectedChoice.count || 1;
                            const itemName = selectedChoice.of?.name;

                            if (itemName) {
                                startingItems.push({
                                    name: itemName,
                                    quantity: count,
                                });
                            }
                        } else if (selectedChoice.option_type === "choice") {
                            // For nested choices (e.g., "any martial weapon"), we'll skip for now
                            // as they require user to make a specific selection
                            // This would need UI enhancement to handle
                        }
                    }
                }
            });
        }

        // Create character and items in a transaction
        const character = await prisma.$transaction(async (tx) => {
            const newCharacter = await tx.character.create({
                data: {
                    name: input.name,
                    userId: this.actor.userId,
                    generationMethod: input.generationMethod,
                    abilityScores: finalAbilityScores,
                    ancestry: input.ancestry,
                    charClass: input.charClass,
                    background: input.background,
                    alignment: input.alignment,
                    proficiencies: input.proficiencies,
                },
            });

            // Create starting equipment items
            if (startingItems.length > 0) {
                await tx.item.createMany({
                    data: startingItems.map((item) => ({
                        characterId: newCharacter.id,
                        name: item.name,
                        quantity: item.quantity,
                        isCustom: false,
                    })),
                });
            }

            return newCharacter;
        });

        return character;
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
        if (this.actor.role === "guest") {
            throw new Error("Guest access cannot level up characters.");
        }

        const existing = await this.requireCharacter(input.characterId);
        const nextLevel = Math.min(MAX_CHARACTER_LEVEL, existing.level + 1);

        if (nextLevel === existing.level) {
            return { updated: false, level: existing.level };
        }

        const requirements = getLevelRequirement(existing.charClass, existing.subclass, nextLevel);

        if (requirements.requiresSubclass && !input.subclass) {
            throw new Error("Subclass selection is required at this level.");
        }

        const hitDieValue = getHitDieValue(existing.charClass);

        if (typeof input.hitDiceRoll !== "number" || input.hitDiceRoll < 1 || input.hitDiceRoll > hitDieValue) {
            throw new Error(`Roll your d${hitDieValue} hit die before applying this level up.`);
        }

        if (requirements.abilityScoreIncrements === 0 && input.abilityIncreases.length > 0) {
            throw new Error("Ability score improvements are not unlocked at this level.");
        }

        const requestedAbilityIncreases = requirements.abilityScoreIncrements > 0
            ? input.abilityIncreases.slice(0, requirements.abilityScoreIncrements)
            : [];
        const featSelected = Boolean(requirements.allowFeatChoice && input.feat);

        if (!requirements.allowFeatChoice && featSelected) {
            throw new Error("Feat choices are not unlocked at this level.");
        }

        if (requirements.allowFeatChoice) {
            if (featSelected && requestedAbilityIncreases.length > 0) {
                throw new Error("Select either a feat or ability score improvements, not both.");
            }
            if (!featSelected && requirements.abilityScoreIncrements > 0 && requestedAbilityIncreases.length !== requirements.abilityScoreIncrements) {
                throw new Error(`Select ${requirements.abilityScoreIncrements} ability score increases for this level.`);
            }
        } else if (requirements.abilityScoreIncrements > 0 && requestedAbilityIncreases.length !== requirements.abilityScoreIncrements) {
            throw new Error(`Select ${requirements.abilityScoreIncrements} ability score increases for this level.`);
        }

        const appliedAbilityIncreases = featSelected ? [] : requestedAbilityIncreases;
        const featChoice = requirements.allowFeatChoice && featSelected ? input.feat ?? null : null;
        const subclassChoice = input.subclass ?? null;

        const storedAbilityScores = existing.abilityScores as Partial<Record<AbilityKey, number>> | null;
        const abilityScores = ABILITY_KEYS.reduce<Record<AbilityKey, number>>((scores, ability) => {
            const storedValue = storedAbilityScores?.[ability];
            const baseValue = typeof storedValue === "number" ? storedValue : DEFAULT_ABILITY_SCORES[ability];
            scores[ability] = baseValue;
            return scores;
        }, { ...DEFAULT_ABILITY_SCORES });

        for (const choice of appliedAbilityIncreases) {
            const currentScore = abilityScores[choice.ability];
            const nextScore = currentScore + choice.amount;
            if (nextScore > MAX_LEVEL_UP_ABILITY_SCORE) {
                throw new Error(`${choice.ability.toUpperCase()} cannot exceed ${MAX_LEVEL_UP_ABILITY_SCORE}. Adjust your ability score improvements.`);
            }
            abilityScores[choice.ability] = nextScore;
        }

        const levelUpChoices: LevelUpChoicesMeta = {
            ...input,
            abilityIncreases: appliedAbilityIncreases,
            feat: featChoice,
            subclass: subclassChoice,
            fromLevel: existing.level,
            toLevel: nextLevel,
            appliedAt: new Date().toISOString(),
        };

        // Update character with new level, ability scores, levelUpChoices, and subclass (if selected)
        const updateData: {
            level: number;
            levelUpChoices: LevelUpChoicesMeta;
            abilityScores: Record<AbilityKey, number>;
            subclass?: string;
        } = {
            level: nextLevel,
            levelUpChoices,
            abilityScores,
        };

        if (subclassChoice) {
            updateData.subclass = subclassChoice;
        }

        await prisma.character.update({ where: { id: input.characterId }, data: updateData });
        return { updated: true, level: nextLevel };
    }

    async addSpell(input: AddSpellInput) {
        if (this.actor.role === "guest") {
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

        const slotSummary = getSpellSlotSummary(character.charClass, character.level);
        const maxSpellLevel = slotSummary.maxSpellLevel;

        if (spellLevel > maxSpellLevel) {
            const classLabel = character.charClass ?? "This class";
            if (maxSpellLevel <= 0) {
                throw new Error(`${classLabel} has not unlocked spell slots yet. Limit additions to cantrips for now.`);
            }
            throw new Error(`${classLabel} can currently add up to ${formatSpellLevelLabel(maxSpellLevel)} spells.`);
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
        if (this.actor.role === "guest") {
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
        if (this.actor.role === "guest") {
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

    async addItem(input: AddItemInput) {
        if (this.actor.role === "guest") {
            throw new Error("Sign in to manage inventory.");
        }

        const character = await this.requireCharacter(input.characterId);

        let itemName = input.name;
        let itemCategory = input.category;
        let itemCost = input.cost;
        let itemWeight = input.weight;
        let itemDescription = input.description;

        if (!input.isCustom) {
            if (!input.referenceId) {
                throw new Error("Select an item from the SRD list or convert it to a custom entry.");
            }

            const reference = findReferenceItemById(input.referenceId);

            if (!reference) {
                throw new Error("The selected item could not be found. Refresh the library and try again.");
            }

            itemName = reference.name;
            itemCategory = reference.categories[0] ?? itemCategory;
            itemCost = reference.costLabel ?? itemCost;
            itemWeight = typeof reference.weight === "number" ? reference.weight : itemWeight;
            itemDescription = reference.description ?? itemDescription;
        }

        const quantity = Math.min(999, Math.max(1, input.quantity));

        await prisma.item.create({
            data: {
                characterId: character.id,
                name: itemName,
                category: itemCategory,
                cost: itemCost,
                weight: itemWeight,
                quantity,
                description: itemDescription,
                notes: input.notes,
                referenceId: input.isCustom ? null : input.referenceId,
                isCustom: input.isCustom,
                customStats: input.customStats,
            },
        });

        return character.id;
    }

    async deleteItem(itemId: string) {
        if (this.actor.role === "guest") {
            throw new Error("Guest access cannot modify inventory.");
        }

        const item = await prisma.item.findUnique({
            where: { id: itemId },
            select: {
                id: true,
                characterId: true,
                character: { select: { userId: true } },
            },
        });

        if (!item) {
            throw new Error("Item not found or access denied.");
        }

        this.ensureOwnership(item.character.userId);
        await prisma.item.delete({ where: { id: itemId } });
        return item.characterId;
    }

    async equipItem(input: EquipItemInput) {
        if (this.actor.role === "guest") {
            throw new Error("Guest access cannot modify equipment.");
        }

        const item = await prisma.item.findUnique({
            where: { id: input.itemId },
            select: {
                id: true,
                characterId: true,
                character: { select: { userId: true } },
            },
        });

        if (!item || item.characterId !== input.characterId) {
            throw new Error("Item not found or access denied.");
        }

        this.ensureOwnership(item.character.userId);

        if (!input.slot) {
            await prisma.item.update({ where: { id: input.itemId }, data: { equippedSlot: null } });
            return input.characterId;
        }

        await prisma.$transaction([
            prisma.item.updateMany({
                where: { characterId: input.characterId, equippedSlot: input.slot },
                data: { equippedSlot: null },
            }),
            prisma.item.update({
                where: { id: input.itemId },
                data: { equippedSlot: input.slot },
            }),
        ]);

        return input.characterId;
    }

    async updateItemStats(itemId: string, customStatsRaw: unknown) {
        if (this.actor.role === "guest") {
            throw new Error("Guest access cannot modify items.");
        }

        const item = await prisma.item.findUnique({
            where: { id: itemId },
            select: {
                id: true,
                characterId: true,
                character: { select: { userId: true } },
            },
        });

        if (!item) {
            throw new Error("Item not found or access denied.");
        }

        this.ensureOwnership(item.character.userId);

        const customStats = normalizeCustomStats(customStatsRaw);

        await prisma.item.update({
            where: { id: itemId },
            data: { customStats },
        });

        return item.characterId;
    }
}
