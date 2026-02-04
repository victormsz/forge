export type SpellPreparationMode = "PREPARES_DAILY" | "VERSATILITY_LONG_REST" | "FIXED_LEVEL_UP" | "UNKNOWN";

export interface SpellPreparationProfile {
    mode: SpellPreparationMode;
    title: string;
    rule: string;
    tashaNote?: string;
}

const defaultProfile: SpellPreparationProfile = {
    mode: "UNKNOWN",
    title: "Spell routine unknown",
    rule: "This class is not cataloged yet. Track prepared versus known spells however your table prefers.",
};

const CLASS_RULES = new Map<string, SpellPreparationProfile>([
    [
        "wizard",
        {
            mode: "PREPARES_DAILY",
            title: "Prepared spellcaster",
            rule: "Prepare a daily spell list from your spellbook after each long rest.",
            tashaNote: "Tasha's Cauldron keeps the same preparation cadence.",
        },
    ],
    [
        "cleric",
        {
            mode: "PREPARES_DAILY",
            title: "Prepared spellcaster",
            rule: "Prepare spells from the full cleric list each day; domain spells are always prepared.",
            tashaNote: "Tasha's Cauldron does not change cleric prep rules.",
        },
    ],
    [
        "druid",
        {
            mode: "PREPARES_DAILY",
            title: "Prepared spellcaster",
            rule: "Prepare a druid spell list after every long rest based on your level and Wisdom.",
            tashaNote: "Tasha's Cauldron leaves druid prep unchanged.",
        },
    ],
    [
        "paladin",
        {
            mode: "PREPARES_DAILY",
            title: "Prepared spellcaster",
            rule: "Prepare paladin spells each day from the class list. Channel Divinity and oath spells stay prepared.",
            tashaNote: "Tasha's adds optional features but prep rules stay the same.",
        },
    ],
    [
        "artificer",
        {
            mode: "PREPARES_DAILY",
            title: "Prepared spellcaster",
            rule: "Prepare artificer spells after a long rest. The class itself debuted with this prepared mechanic.",
            tashaNote: "Official launch in Eberron and Tasha's uses the same prep cadence.",
        },
    ],
    [
        "ranger",
        {
            mode: "VERSATILITY_LONG_REST",
            title: "Known spells with versatility",
            rule: "Knows a fixed list of spells. Optional Spell Versatility lets you swap one known spell after each long rest.",
            tashaNote: "Tasha's formalizes Spell Versatility for ranger casters.",
        },
    ],
    [
        "sorcerer",
        {
            mode: "VERSATILITY_LONG_REST",
            title: "Known spells with versatility",
            rule: "Knows a fixed list of sorcerer spells. Spell Versatility allows one swap after a long rest.",
            tashaNote: "Tasha's Cauldron introduces the Spell Versatility option here as well.",
        },
    ],
    [
        "bard",
        {
            mode: "FIXED_LEVEL_UP",
            title: "Known spells",
            rule: "Knows a curated spell list and only swaps spells when leveling up (no Spell Versatility by default).",
        },
    ],
    [
        "warlock",
        {
            mode: "FIXED_LEVEL_UP",
            title: "Known spells",
            rule: "Knows a short list of spells. You may trade cantrips or invocations on level up, but spells stay fixed until then.",
        },
    ],
    [
        "eldritch knight",
        {
            mode: "FIXED_LEVEL_UP",
            title: "Known spells",
            rule: "Knows a fighter subclass spell list and only retools choices when leveling up.",
        },
    ],
    [
        "arcane trickster",
        {
            mode: "FIXED_LEVEL_UP",
            title: "Known spells",
            rule: "Knows a rogue subclass spell list and can only swap spells during level ups.",
        },
    ],
]);

const KEYWORD_MATCHES: Array<[string, string]> = [
    ["eldritch knight", "eldritch knight"],
    ["arcane trickster", "arcane trickster"],
];

export function getSpellPreparationProfile(className: string | null | undefined): SpellPreparationProfile {
    if (!className) {
        return defaultProfile;
    }

    const normalized = className.trim().toLowerCase();

    if (!normalized) {
        return defaultProfile;
    }

    const direct = CLASS_RULES.get(normalized);
    if (direct) {
        return direct;
    }

    for (const [keyword, key] of KEYWORD_MATCHES) {
        if (normalized.includes(keyword)) {
            const profile = CLASS_RULES.get(key);
            if (profile) {
                return profile;
            }
        }
    }

    return defaultProfile;
}

export function canManuallyPrepareSpells(className: string | null | undefined) {
    return getSpellPreparationProfile(className).mode === "PREPARES_DAILY";
}
