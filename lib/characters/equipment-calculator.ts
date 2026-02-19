import type { ItemReference } from "@/lib/items/reference";
import type { CharacterProficiencies } from "@/lib/characters/types";
import type { AbilityKey } from "@/lib/point-buy";
import { formatModifier } from "@/lib/characters/statistics";
import {
    extractArmorStats,
    extractWeaponStats,
    extractShieldStats,
} from "@/lib/characters/equipment-stats-extractor";
import type {
    EquippedItem,
    EquipmentBonuses,
    EquipmentCalculatorInput,
} from "@/lib/characters/equipment-types";

/**
 * Equipment Calculator
 * 
 * Single Responsibility: Calculates combat bonuses from equipped gear.
 * Open/Closed: Easy to extend with new equipment types without modification.
 * Dependency Inversion: Works with extracted stats, not raw database models.
 */
export class EquipmentCalculator {
    private readonly input: EquipmentCalculatorInput;

    constructor(input: EquipmentCalculatorInput) {
        this.input = input;
    }

    /**
     * Calculates all equipment bonuses for the character.
     */
    calculateBonuses(): EquipmentBonuses {
        const armorClass = this.calculateArmorClass();
        const mainHand = this.calculateMainHandWeapon();
        const offHand = this.calculateOffHandWeapon();

        return {
            armorClass,
            mainHand,
            offHand,
        };
    }

    /**
     * Calculates total armor class from equipped gear.
     */
    private calculateArmorClass() {
        const equippedArmor = this.findEquippedItem("ARMOR");
        const equippedShield = this.findEquippedItem("SHIELD");

        const armorStats = extractArmorStats(equippedArmor?.reference ?? null);
        const shieldStats = extractShieldStats(equippedShield?.reference ?? null);

        const base = this.calculateArmorBase(armorStats);
        const dexModifier = this.calculateDexModifier(armorStats);
        const shield = shieldStats?.acBonus ?? 0;
        const legacyBonuses = this.calculateLegacyBonuses();

        const total = base + dexModifier + shield + legacyBonuses;
        const breakdown = this.buildArmorBreakdown(
            armorStats,
            equippedArmor?.reference,
            base,
            dexModifier,
            shield,
            legacyBonuses
        );

        return {
            total,
            breakdown,
            components: {
                base,
                dexModifier,
                shield,
                legacyBonuses,
            },
        };
    }

    /**
     * Calculates main hand weapon bonuses.
     */
    private calculateMainHandWeapon() {
        const equipped = this.findEquippedItem("MAIN_HAND");
        if (!equipped) {
            return this.calculateUnarmedStrike();
        }

        const weaponStats = extractWeaponStats(equipped.reference);
        if (!weaponStats) {
            return this.calculateUnarmedStrike();
        }

        const abilityModifier = this.chooseWeaponAbilityModifier(equipped.reference);
        const proficient = this.isWeaponProficient(equipped.reference);
        const attackBonus = abilityModifier + (proficient ? this.input.proficiencyBonus : 0);
        const totalDamageBonus = abilityModifier + weaponStats.damageBonus;
        const damage = this.formatWeaponDamage(weaponStats.damageDice, totalDamageBonus, weaponStats.damageType);

        return {
            name: equipped.name,
            attackBonus,
            damage,
            proficient,
        };
    }

    /**
     * Calculates off hand weapon bonuses.
     */
    private calculateOffHandWeapon() {
        const equipped = this.findEquippedItem("OFF_HAND");
        if (!equipped) {
            return null;
        }

        const weaponStats = extractWeaponStats(equipped.reference);
        if (!weaponStats) {
            return null;
        }

        const abilityModifier = this.chooseWeaponAbilityModifier(equipped.reference);
        const proficient = this.isWeaponProficient(equipped.reference);
        const attackBonus = abilityModifier + (proficient ? this.input.proficiencyBonus : 0);
        const totalDamageBonus = abilityModifier + weaponStats.damageBonus;
        const damage = this.formatWeaponDamage(weaponStats.damageDice, totalDamageBonus, weaponStats.damageType);

        return {
            name: equipped.name,
            attackBonus,
            damage,
            proficient,
        };
    }

    /**
     * Calculates unarmed strike bonuses.
     */
    private calculateUnarmedStrike() {
        const strModifier = this.input.abilityModifiers.str;
        const attackBonus = strModifier + this.input.proficiencyBonus;
        const damage = this.formatWeaponDamage("1", strModifier, "bludgeoning");

        return {
            name: "Unarmed Strike",
            attackBonus,
            damage,
            proficient: true,
        };
    }

    /**
     * Calculates base AC from armor or unarmored.
     */
    private calculateArmorBase(armorStats: ReturnType<typeof extractArmorStats>): number {
        if (!armorStats) {
            return 10;
        }
        return armorStats.base;
    }

    /**
     * Calculates DEX modifier contribution to AC.
     */
    private calculateDexModifier(armorStats: ReturnType<typeof extractArmorStats>): number {
        const dexMod = this.input.abilityModifiers.dex;

        if (!armorStats) {
            return dexMod;
        }

        if (!armorStats.dexBonus) {
            return 0;
        }

        if (armorStats.maxDexBonus !== null) {
            return Math.min(dexMod, armorStats.maxDexBonus);
        }

        return dexMod;
    }

    /**
     * Calculates legacy bonus fields for backward compatibility.
     */
    private calculateLegacyBonuses(): number {
        const armorBonus = this.input.legacyArmorBonus ?? 0;
        const shieldBonus = this.input.legacyShieldBonus ?? 0;
        const miscBonus = this.input.legacyMiscBonus ?? 0;
        return armorBonus + shieldBonus + miscBonus;
    }

    /**
     * Builds human-readable AC breakdown.
     */
    private buildArmorBreakdown(
        armorStats: ReturnType<typeof extractArmorStats>,
        armorReference: ItemReference | null,
        base: number,
        dexModifier: number,
        shield: number,
        legacyBonuses: number
    ): string {
        const segments: string[] = [];

        if (armorStats && armorReference) {
            segments.push(`${armorReference.name} base ${armorStats.base}`);

            if (armorStats.dexBonus) {
                const maxBonus = armorStats.maxDexBonus;
                const dexLabel = formatModifier(dexModifier);
                const maxLabel = maxBonus !== null ? ` (max +${maxBonus})` : "";
                segments.push(`${dexLabel} DEX${maxLabel}`);
            } else {
                segments.push("DEX not applied");
            }
        } else {
            segments.push("10 base");
            segments.push(`${formatModifier(dexModifier)} DEX`);
        }

        if (shield > 0) {
            segments.push(`+${shield} shield`);
        }

        if (legacyBonuses > 0) {
            segments.push(`+${legacyBonuses} misc`);
        }

        return segments.join(" · ");
    }

    /**
     * Chooses the appropriate ability modifier for a weapon.
     */
    private chooseWeaponAbilityModifier(reference: ItemReference | null): number {
        if (!reference) {
            return this.input.abilityModifiers.str;
        }

        const properties = reference.properties?.map(p => p.toLowerCase()) ?? [];
        const isFinesse = properties.includes("finesse");
        const isRanged = properties.includes("range") || properties.includes("ammunition");

        if (isRanged) {
            return this.input.abilityModifiers.dex;
        }

        if (isFinesse) {
            return Math.max(this.input.abilityModifiers.dex, this.input.abilityModifiers.str);
        }

        return this.input.abilityModifiers.str;
    }

    /**
     * Checks if character is proficient with a weapon.
     */
    private isWeaponProficient(reference: ItemReference | null): boolean {
        if (!reference) {
            return false;
        }

        const proficiencyNames = this.input.proficiencies.weapons.map(w => w.toLowerCase());
        const categories = (reference.categories ?? []).map(c => c.toLowerCase());
        const name = reference.name.toLowerCase();

        return proficiencyNames.some(proficiency => {
            if (!proficiency.trim()) {
                return false;
            }

            if (proficiency.includes("all weapon")) {
                return categories.some(category => category.includes("weapon"));
            }

            return (
                name.includes(proficiency) ||
                categories.some(category =>
                    category.includes(proficiency) || proficiency.includes(category)
                )
            );
        });
    }

    /**
     * Formats weapon damage string.
     */
    private formatWeaponDamage(dice: string, totalBonus: number, damageType: string | null): string {
        const bonusLabel = totalBonus === 0
            ? ""
            : totalBonus > 0
                ? ` + ${totalBonus}`
                : ` - ${Math.abs(totalBonus)}`;
        const typeLabel = damageType ? ` ${damageType}` : "";
        return `${dice}${bonusLabel}${typeLabel}`;
    }

    /**
     * Finds an equipped item by slot.
     */
    private findEquippedItem(slot: string): EquippedItem | null {
        return this.input.equippedItems.find(item => item.slot === slot) ?? null;
    }
}
