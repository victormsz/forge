import type { ItemReference } from "@/lib/items/reference";
import type { ArmorStats, WeaponStats, ShieldStats } from "@/lib/characters/equipment-types";

/**
 * Extracts armor statistics from an item reference.
 * Single Responsibility: Only responsible for reading armor data from item references.
 */
export function extractArmorStats(reference: ItemReference | null): ArmorStats | null {
    if (!reference?.armorClass) {
        return null;
    }

    return {
        base: reference.armorClass.base,
        dexBonus: reference.armorClass.dexBonus ?? false,
        maxDexBonus: reference.armorClass.maxBonus ?? null,
    };
}

/**
 * Extracts weapon statistics from an item reference.
 * Single Responsibility: Only responsible for reading weapon data from item references.
 */
export function extractWeaponStats(reference: ItemReference | null): WeaponStats | null {
    if (!reference?.damageLabel) {
        return null;
    }

    const parsed = parseDamageLabel(reference.damageLabel);
    if (!parsed) {
        return null;
    }

    return {
        damageLabel: reference.damageLabel,
        damageDice: parsed.dice,
        damageBonus: parsed.bonus,
        damageType: parsed.damageType,
        properties: reference.properties ?? [],
        rangeLabel: reference.rangeLabel ?? null,
    };
}

/**
 * Extracts shield statistics from an item reference.
 * Single Responsibility: Only responsible for reading shield data from item references.
 */
export function extractShieldStats(reference: ItemReference | null): ShieldStats | null {
    if (!reference?.armorClass?.base) {
        return null;
    }

    return {
        acBonus: reference.armorClass.base,
    };
}

/**
 * Parses a damage label string into its components.
 * Internal utility function for damage parsing.
 */
function parseDamageLabel(damageLabel: string): {
    dice: string;
    bonus: number;
    damageType: string | null;
} | null {
    const base = damageLabel.split(" (")[0] ?? damageLabel;
    const match = base.match(/^(\d+d\d+)\s*([+-]\s*\d+)?\s*(.*)?$/i);

    if (!match) {
        return null;
    }

    const bonus = match[2] ? Number(match[2].replace(/\s+/g, "")) : 0;
    const tail = match[3]?.trim() ?? "";
    const damageType = tail.replace(/\s*damage$/i, "").trim() || null;

    return {
        dice: match[1],
        bonus: Number.isFinite(bonus) ? bonus : 0,
        damageType,
    };
}
