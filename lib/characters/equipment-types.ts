import type { ItemReference } from "@/lib/items/reference";
import type { EquipmentSlot, CharacterProficiencies } from "@/lib/characters/types";
import type { AbilityKey } from "@/lib/point-buy";

export interface EquippedItem {
    id: string;
    name: string;
    slot: EquipmentSlot;
    referenceId: string | null;
    reference: ItemReference | null;
}

export interface ArmorStats {
    base: number;
    dexBonus: boolean;
    maxDexBonus: number | null;
}

export interface WeaponStats {
    damageLabel: string;
    damageDice: string;
    damageBonus: number;
    damageType: string | null;
    properties: string[];
    rangeLabel: string | null;
}

export interface ShieldStats {
    acBonus: number;
}

export interface EquipmentBonuses {
    armorClass: {
        total: number;
        breakdown: string;
        components: {
            base: number;
            dexModifier: number;
            shield: number;
            legacyBonuses: number;
        };
    };
    mainHand: {
        name: string;
        attackBonus: number;
        damage: string;
        proficient: boolean;
    } | null;
    offHand: {
        name: string;
        attackBonus: number;
        damage: string;
        proficient: boolean;
    } | null;
}

export interface EquipmentCalculatorInput {
    equippedItems: EquippedItem[];
    abilityModifiers: Record<AbilityKey, number>;
    proficiencyBonus: number;
    proficiencies: CharacterProficiencies;
    legacyArmorBonus?: number;
    legacyShieldBonus?: number;
    legacyMiscBonus?: number;
}
