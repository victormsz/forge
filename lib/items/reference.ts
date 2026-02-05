import equipmentPayload from "@/db/2024/5e-SRD-Equipment.json";
import magicItemPayload from "@/db/2014/5e-SRD-Magic-Items.json";

export interface ItemReference {
    id: string;
    slug: string;
    name: string;
    categories: string[];
    categoryIds: string[];
    costLabel: string | null;
    weight: number | null;
    description: string | null;
    rarity: string | null;
    properties: string[];
    detailTags: string[];
    damageLabel: string | null;
    rangeLabel: string | null;
    bundleQuantity: number | null;
    armorClass: ArmorClassInfo | null;
    imageUrl: string | null;
    sourceUrl: string | null;
}

export interface ArmorClassInfo {
    base: number;
    dexBonus: boolean;
    maxBonus: number | null;
}

export interface ItemCategoryOption {
    id: string;
    label: string;
    count: number;
}

interface RawEquipmentRecord {
    index?: string | null;
    name?: string | null;
    equipment_categories?: Array<{ index?: string | null; name?: string | null }> | null;
    gear_category?: { index?: string | null; name?: string | null } | null;
    equipment_category?: { index?: string | null; name?: string | null } | null;
    cost?: { quantity?: number | string | null; unit?: string | null } | null;
    weight?: number | string | null;
    quantity?: number | string | null;
    description?: string | null;
    desc?: Array<string | null> | null;
    properties?: Array<{ name?: string | null }> | null;
    damage?: {
        damage_dice?: string | null;
        damage_type?: { name?: string | null } | null;
    } | null;
    two_handed_damage?: {
        damage_dice?: string | null;
        damage_type?: { name?: string | null } | null;
    } | null;
    range?: {
        normal?: number | string | null;
        long?: number | string | null;
    } | null;
    armor_class?: {
        base?: number | string | null;
        dex_bonus?: boolean | null;
        max_bonus?: number | string | null;
    } | null;
    stealth_disadvantage?: boolean | null;
    str_minimum?: number | string | null;
    mastery?: { name?: string | null } | null;
    ability?: { name?: string | null } | null;
    rarity?: { name?: string | null } | null;
    variant?: boolean | null;
    variants?: Array<{ index?: string | null; name?: string | null }> | null;
    url?: string | null;
    image?: string | null;
}

const baseEquipmentRecords: RawEquipmentRecord[] = Array.isArray(equipmentPayload)
    ? (equipmentPayload as RawEquipmentRecord[])
    : [];
const magicEquipmentRecords: RawEquipmentRecord[] = Array.isArray(magicItemPayload)
    ? (magicItemPayload as RawEquipmentRecord[])
    : [];

const rawEquipment: RawEquipmentRecord[] = [...baseEquipmentRecords, ...magicEquipmentRecords];

const normalizedItems: ItemReference[] = rawEquipment
    .map((record) => normalizeItem(record))
    .filter((item): item is ItemReference => Boolean(item));

const categoryIndex = buildCategoryIndex(normalizedItems);

export function getReferenceItems() {
    return normalizedItems;
}

export function findReferenceItemById(id: string) {
    return normalizedItems.find((item) => item.id === id) ?? null;
}

export function getItemCategoryOptions(): ItemCategoryOption[] {
    return Array.from(categoryIndex.values()).sort((a, b) => b.count - a.count);
}

function normalizeItem(entry: RawEquipmentRecord): ItemReference | null {
    const name = sanitizeText(entry.name);

    if (!name) {
        return null;
    }

    const slug = (entry.index ?? slugify(name)).toLowerCase();
    const categories = extractCategoryNames(entry);
    const categoryIds = extractCategoryIds(entry);
    const costLabel = formatCost(entry.cost);
    const weight = parseWeight(entry.weight);
    const description = sanitizeLongText(buildDescription(entry));
    const rarityLabel = sanitizeText(entry.rarity?.name);
    const properties = extractProperties(entry.properties);
    const damageLabel = resolveDamageLabel(entry, description);
    const rangeLabel = formatRange(entry.range);
    const bundleQuantity = parseInteger(entry.quantity);
    const detailTags = buildDetailTags(entry, description, rarityLabel, damageLabel, rangeLabel, bundleQuantity, properties);
    const armorClass = extractArmorClass(entry.armor_class);

    return {
        id: slug,
        slug,
        name,
        categories,
        categoryIds,
        costLabel,
        weight,
        description,
        rarity: rarityLabel,
        properties,
        detailTags,
        damageLabel,
        rangeLabel,
        bundleQuantity,
        armorClass,
        imageUrl: sanitizeText(entry.image),
        sourceUrl: sanitizeText(entry.url),
    };
}

function extractCategoryNames(entry: RawEquipmentRecord) {
    return collectCategoryEntries(entry)
        .map((category) => sanitizeText(category?.name))
        .filter((category): category is string => Boolean(category));
}

function extractCategoryIds(entry: RawEquipmentRecord) {
    return collectCategoryEntries(entry)
        .map((category) => sanitizeText(category?.index))
        .filter((category): category is string => Boolean(category));
}

function collectCategoryEntries(entry: RawEquipmentRecord) {
    const categories: Array<{ index?: string | null; name?: string | null }> = [];
    if (Array.isArray(entry.equipment_categories)) {
        categories.push(...entry.equipment_categories);
    }
    if (entry.gear_category) {
        categories.push(entry.gear_category);
    }
    if (entry.equipment_category) {
        categories.push(entry.equipment_category);
    }
    return categories;
}

function extractProperties(properties: RawEquipmentRecord["properties"]) {
    if (!Array.isArray(properties)) {
        return [];
    }
    return properties
        .map((property) => sanitizeText(property?.name))
        .filter((property): property is string => Boolean(property));
}

function buildDetailTags(
    entry: RawEquipmentRecord,
    description: string | null,
    rarityLabel: string | null,
    damageLabel: string | null,
    rangeLabel: string | null,
    bundleQuantity: number | null,
    properties: string[],
) {
    const tags = new Set<string>();

    if (rarityLabel) {
        tags.add(`${rarityLabel} rarity`);
    }
    if (damageLabel) {
        tags.add(damageLabel);
    }
    if (rangeLabel) {
        tags.add(rangeLabel);
    }
    if (description && /requires attunement/i.test(description)) {
        tags.add("Requires attunement");
    }
    if (bundleQuantity && bundleQuantity > 1) {
        tags.add(`Bundle of ${bundleQuantity}`);
    }
    if (entry.mastery?.name) {
        tags.add(`Mastery: ${entry.mastery.name}`);
    }
    if (entry.ability?.name) {
        tags.add(`Ability: ${entry.ability.name}`);
    }
    if (entry.armor_class?.base) {
        const acSegments = formatArmorClass(entry.armor_class);
        if (acSegments) {
            tags.add(acSegments);
        }
    }
    if (entry.stealth_disadvantage) {
        tags.add("Stealth disadvantage");
    }
    const strengthRequirement = parseInteger(entry.str_minimum);
    if (strengthRequirement) {
        tags.add(`STR ${strengthRequirement}+ required`);
    }
    if (entry.variant) {
        tags.add("Variant item");
    }
    if (Array.isArray(entry.variants) && entry.variants.length > 0) {
        tags.add("Includes variants");
    }
    properties.forEach((property) => tags.add(property));

    return Array.from(tags).slice(0, 8);
}

function formatDamage(
    primary: RawEquipmentRecord["damage"],
    versatile: RawEquipmentRecord["two_handed_damage"],
) {
    const primaryLabel = formatDamageEntry(primary);
    const versatileLabel = formatDamageEntry(versatile);

    if (primaryLabel && versatileLabel) {
        return `${primaryLabel} (two-handed ${versatileLabel})`;
    }
    return primaryLabel ?? versatileLabel;
}

function formatDamageEntry(entry: RawEquipmentRecord["damage"]) {
    if (!entry || entry.damage_dice == null) {
        return null;
    }
    const dice = typeof entry.damage_dice === "number" ? entry.damage_dice.toString() : sanitizeText(entry.damage_dice);
    if (!dice) {
        return null;
    }
    const type = sanitizeText(entry.damage_type?.name);
    return type ? `${dice} ${type}` : dice;
}

function resolveDamageLabel(entry: RawEquipmentRecord, description: string | null) {
    const structured = formatDamage(entry.damage, entry.two_handed_damage);
    if (structured) {
        return structured;
    }
    return extractDamageFromDescription(description);
}

function extractDamageFromDescription(description: string | null) {
    if (!description) {
        return null;
    }
    const damageTypes = "acid|cold|fire|force|lightning|necrotic|poison|psychic|radiant|thunder|bludgeoning|piercing|slashing";
    const dicePattern = new RegExp(`(\\d+d\\d+(?:\\s*[+-]\\s*\\d+)?)\\s*(${damageTypes})\\s*damage`, "i");
    const diceMatch = description.match(dicePattern);
    if (diceMatch) {
        const dice = diceMatch[1]?.replace(/\s+/g, " ").trim();
        const type = diceMatch[2]?.trim();
        if (dice && type) {
            return `${dice} ${type}`;
        }
    }
    const fallbackPattern = /damage(?:\s*die)?(?:\s*of)?\s*(\d+d\d+(?:\s*[+-]\s*\d+)?)/i;
    const fallbackMatch = description.match(fallbackPattern);
    const fallbackDice = fallbackMatch?.[1]?.replace(/\s+/g, " ").trim();
    return fallbackDice || null;
}

function formatRange(range: RawEquipmentRecord["range"]) {
    if (!range) {
        return null;
    }
    const normal = parseInteger(range.normal);
    const long = parseInteger(range.long);
    if (normal && long) {
        return `Range ${normal}/${long} ft`;
    }
    if (normal) {
        return `Range ${normal} ft`;
    }
    return null;
}

function formatArmorClass(ac: RawEquipmentRecord["armor_class"]) {
    if (!ac) {
        return null;
    }
    const base = parseInteger(ac.base);
    if (!base) {
        return null;
    }
    const dexBonus = ac.dex_bonus ? "+ DEX" : "";
    const maxBonus = parseInteger(ac.max_bonus);
    const maxSegment = dexBonus && maxBonus ? ` (max +${maxBonus})` : "";
    return `AC ${base}${dexBonus}${maxSegment}`;
}

function extractArmorClass(ac: RawEquipmentRecord["armor_class"]): ArmorClassInfo | null {
    if (!ac) {
        return null;
    }
    const base = parseInteger(ac.base);
    if (!base) {
        return null;
    }
    const maxBonus = parseInteger(ac.max_bonus);
    return {
        base,
        dexBonus: Boolean(ac.dex_bonus),
        maxBonus: maxBonus ?? null,
    };
}

function formatCost(cost: RawEquipmentRecord["cost"]) {
    if (!cost) {
        return null;
    }
    const quantity = typeof cost.quantity === "number" ? cost.quantity : Number(cost.quantity);
    const unit = sanitizeText(cost.unit);
    if (!Number.isFinite(quantity) || !unit) {
        return null;
    }
    return `${quantity} ${unit}`;
}

function parseWeight(value: RawEquipmentRecord["weight"]) {
    if (typeof value === "number") {
        return value;
    }
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
        return null;
    }
    return Math.round(numeric * 100) / 100;
}

function parseInteger(value: unknown) {
    const numeric = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(numeric)) {
        return null;
    }
    const integer = Math.trunc(numeric);
    return integer > 0 ? integer : null;
}

function sanitizeText(value: unknown) {
    if (typeof value !== "string") {
        return null;
    }
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
}

function sanitizeLongText(value: unknown) {
    const text = sanitizeText(value);
    if (!text) {
        return null;
    }
    return text.length > 1800 ? `${text.slice(0, 1797)}...` : text;
}

function buildDescription(entry: RawEquipmentRecord) {
    if (entry.description) {
        return entry.description;
    }
    if (Array.isArray(entry.desc)) {
        const paragraphs = entry.desc
            .map((segment) => (typeof segment === "string" ? segment.trim() : ""))
            .filter((segment) => segment.length > 0);
        if (paragraphs.length > 0) {
            return paragraphs.join("\n\n");
        }
    }
    return null;
}

function slugify(value: string) {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9]+/gi, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 48);
}

function buildCategoryIndex(items: ItemReference[]) {
    const index = new Map<string, ItemCategoryOption>();
    for (const item of items) {
        item.categoryIds.forEach((id, idx) => {
            const label = item.categories[idx] ?? id;
            const existing = index.get(id);
            if (existing) {
                existing.count += 1;
            } else {
                index.set(id, { id, label, count: 1 });
            }
        });
    }
    return index;
}
