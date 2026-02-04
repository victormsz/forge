import spellPayload from "@/public/spells.json";

export interface SpellReference {
    id: string;
    name: string;
    level: number;
    classes: string[];
    school: string | null;
    ritual: boolean;
    castingTime: string | null;
    range: string | null;
    components: string | null;
    material: string | null;
    duration: string | null;
    description: string | null;
    source: string | null;
    page: number | null;
}

interface RawSpellRecord {
    name?: string | null;
    classes?: string | null;
    level?: number | string | null;
    school?: string | null;
    ritual?: boolean | string | null;
    castingTime?: string | null;
    range?: string | null;
    components?: string | null;
    material?: string | null;
    [key: string]: unknown;
}

const rawSpells: RawSpellRecord[] = Array.isArray((spellPayload as { allSpells?: RawSpellRecord[] }).allSpells)
    ? ((spellPayload as { allSpells?: RawSpellRecord[] }).allSpells as RawSpellRecord[])
    : [];

const normalizedSpells: SpellReference[] = rawSpells
    .map((entry, index) => normalizeSpell(entry, index))
    .filter((spell): spell is SpellReference => Boolean(spell));

export function getReferenceSpells() {
    return normalizedSpells;
}

export function findReferenceSpellById(id: string) {
    return normalizedSpells.find((spell) => spell.id === id) ?? null;
}

export function spellSupportsClass(spell: SpellReference, className: string | null | undefined) {
    if (!className) {
        return true;
    }

    const normalizedClass = className.trim().toLowerCase();

    if (!normalizedClass) {
        return true;
    }

    if (spell.classes.length === 0) {
        return false;
    }

    return spell.classes.some((cls) => normalizedClass.includes(cls.toLowerCase()));
}

function normalizeSpell(entry: RawSpellRecord, index: number): SpellReference | null {
    const name = sanitizeText(entry.name);

    if (!name) {
        return null;
    }

    const spellId = `${slugify(name)}-${index}`;
    const level = clampLevel(entry.level);
    const classes = parseClasses(entry.classes);
    const school = sanitizeText(entry.school);
    const ritual = parseBoolean(entry.ritual);
    const castingTime = sanitizeText(entry.castingTime);
    const range = sanitizeText(entry.range);
    const components = sanitizeText(entry.components);
    const material = sanitizeText(entry.material ?? (entry["Material:"] as string | undefined));
    const duration = sanitizeText(entry.duration ?? (entry["Duration:"] as string | undefined));
    const description = sanitizeLongText(entry.description ?? (entry["description:"] as string | undefined));
    const source = sanitizeText(entry.source ?? (entry["source:"] as string | undefined));
    const page = parsePageNumber(entry.page ?? (entry["page:"] as number | string | undefined));

    return {
        id: spellId,
        name,
        level,
        classes,
        school,
        ritual,
        castingTime,
        range,
        components,
        material,
        duration,
        description,
        source,
        page,
    };
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
    return text.length > 2000 ? `${text.slice(0, 1997)}...` : text;
}

function parseClasses(value: unknown) {
    if (typeof value !== "string") {
        return [];
    }
    return value
        .split(",")
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);
}

function clampLevel(value: unknown) {
    const numeric = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(numeric)) {
        return 0;
    }
    return Math.min(9, Math.max(0, Math.trunc(numeric)));
}

function parseBoolean(value: unknown) {
    if (typeof value === "boolean") {
        return value;
    }
    if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();
        if (normalized === "true" || normalized === "yes") {
            return true;
        }
        if (normalized === "false" || normalized === "no") {
            return false;
        }
    }
    return false;
}

function parsePageNumber(value: unknown) {
    const numeric = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(numeric)) {
        return null;
    }
    return Math.max(1, Math.trunc(numeric));
}

function slugify(value: string) {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9]+/gi, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 48);
}
