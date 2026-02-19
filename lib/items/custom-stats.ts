/**
 * Custom item stats that can override or augment reference stats
 */
export interface ItemCustomStats {
    // Weapon stats
    damage?: string; // e.g., "1d8+1 slashing" or "1d8 slashing + 1d6 fire"
    attackBonus?: number; // Magical bonus to attack rolls (e.g., +1, +2, +3)
    damageBonus?: number; // Magical bonus to damage rolls
    properties?: string[]; // Weapon properties (Finesse, Versatile, etc.)
    range?: string; // Weapon range (e.g., "30/120 ft", "5 ft")
    mastery?: string; // Weapon mastery property

    // Armor stats
    armorClass?: {
        base: number; // Base AC
        dexBonus?: boolean; // Whether DEX can be added
        maxDexBonus?: number | null; // Max DEX bonus (null = unlimited)
    };
    acBonus?: number; // Magical bonus to AC (e.g., +1, +2, +3)

    // General stats
    rarity?: string; // Common, Uncommon, Rare, Very Rare, Legendary
    requiresAttunement?: boolean;
}

/**
 * Normalizes custom stats from database JSON
 */
export function normalizeCustomStats(raw: unknown): ItemCustomStats | null {
    if (!raw || typeof raw !== "object") {
        return null;
    }

    const stats: ItemCustomStats = {};
    const source = raw as Record<string, unknown>;

    // Weapon stats
    if (typeof source.damage === "string") {
        stats.damage = source.damage;
    }
    if (typeof source.attackBonus === "number") {
        stats.attackBonus = source.attackBonus;
    }
    if (typeof source.damageBonus === "number") {
        stats.damageBonus = source.damageBonus;
    }
    if (Array.isArray(source.properties)) {
        stats.properties = source.properties.filter((p): p is string => typeof p === "string");
    }
    if (typeof source.range === "string") {
        stats.range = source.range;
    }
    if (typeof source.mastery === "string") {
        stats.mastery = source.mastery;
    }

    // Armor stats
    if (source.armorClass && typeof source.armorClass === "object") {
        const ac = source.armorClass as Record<string, unknown>;
        if (typeof ac.base === "number") {
            stats.armorClass = {
                base: ac.base,
                dexBonus: typeof ac.dexBonus === "boolean" ? ac.dexBonus : undefined,
                maxDexBonus: typeof ac.maxDexBonus === "number" ? ac.maxDexBonus : null,
            };
        }
    }
    if (typeof source.acBonus === "number") {
        stats.acBonus = source.acBonus;
    }

    // General stats
    if (typeof source.rarity === "string") {
        stats.rarity = source.rarity;
    }
    if (typeof source.requiresAttunement === "boolean") {
        stats.requiresAttunement = source.requiresAttunement;
    }

    return Object.keys(stats).length > 0 ? stats : null;
}
