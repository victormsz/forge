import type { ItemReference } from "@/lib/items/reference";
import type { ItemCustomStats } from "@/lib/items/custom-stats";
import type { ArmorStats, WeaponStats, ShieldStats } from "@/lib/characters/equipment-types";

/**
 * Extracts armor statistics from an item reference and custom stats.
 * Single Responsibility: Only responsible for reading armor data from item references.
 */
export function extractArmorStats(
    reference: ItemReference | null,
    customStats: ItemCustomStats | null
): ArmorStats | null {
    // Custom stats override reference
    if (customStats?.armorClass) {
        return {
            base: customStats.armorClass.base,
            dexBonus: customStats.armorClass.dexBonus ?? false,
            maxDexBonus: customStats.armorClass.maxDexBonus ?? null,
        };
    }

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
 * Extracts weapon statistics from an item reference and custom stats.
 * Single Responsibility: Only responsible for reading weapon data from item references.
 */
export function extractWeaponStats(
    reference: ItemReference | null,
    customStats: ItemCustomStats | null
): WeaponStats | null {
    // Custom damage label overrides reference
    const damageLabel = customStats?.damage ?? reference?.damageLabel;

    if (!damageLabel) {
        return null;
    }

    const parsed = parseDamageLabel(damageLabel);
    if (!parsed) {
        return null;
    }

    // Properties can be customized
    const properties = customStats?.properties ?? reference?.properties ?? [];
    const rangeLabel = customStats?.range ?? reference?.rangeLabel ?? null;

    return {
        damageLabel,
        damageDice: parsed.dice,
        damageBonus: parsed.bonus,
        damageType: parsed.damageType,
        properties,
        rangeLabel,
    };
}

/**
 * Extracts shield statistics from an item reference and custom stats.
 * Single Responsibility: Only responsible for reading shield data from item references.
 */
export function extractShieldStats(
    reference: ItemReference | null,
    customStats: ItemCustomStats | null
): ShieldStats | null {
    // Custom AC bonus overrides reference
    if (customStats?.acBonus !== undefined) {
        return {
            acBonus: customStats.acBonus,
        };
    }

    if (!reference?.armorClass?.base) {
        return null;
    }

    return {
        acBonus: reference.armorClass.base,
    };
}

/**
 * Gets magical attack bonus from custom stats.
 */
export function getAttackBonus(customStats: ItemCustomStats | null): number {
    return customStats?.attackBonus ?? 0;
}

/**
 * Gets magical damage bonus from custom stats.
 */
export function getDamageBonus(customStats: ItemCustomStats | null): number {
    return customStats?.damageBonus ?? 0;
}

/**
 * Gets magical AC bonus from custom stats.
 */
export function getACBonus(customStats: ItemCustomStats | null): number {
    return customStats?.acBonus ?? 0;
}

/**
 * Parses a damage label string into its components.
 * Supports multi-dice expressions like "1d8+1d6" for elemental damage.
 * Internal utility function for damage parsing.
 */
function parseDamageLabel(damageLabel: string): {
    dice: string;
    bonus: number;
    damageType: string | null;
} | null {
    const base = damageLabel.split(" (")[0] ?? damageLabel;
    // Updated regex to support multiple dice (e.g., "1d8+1d6")
    const match = base.match(/^(\d+d\d+(?:\s*\+\s*\d+d\d+)*)\s*([+-]\s*\d+)?\s*(.*)?$/i);

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
