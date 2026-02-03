export interface SelectOption {
    value: string;
    label: string;
    helper?: string;
}

export const ABILITY_SCORE_PICKLIST: SelectOption[] = [
    { value: "str", label: "Strength" },
    { value: "dex", label: "Dexterity" },
    { value: "con", label: "Constitution" },
    { value: "int", label: "Intelligence" },
    { value: "wis", label: "Wisdom" },
    { value: "cha", label: "Charisma" },
];

export const GLOBAL_FEAT_OPTIONS: SelectOption[] = [
    { value: "alert", label: "Alert", helper: "+5 initiative, no surprise" },
    { value: "actor", label: "Actor", helper: "+1 CHA, mimicry" },
    { value: "crusher", label: "Crusher", helper: "+1 STR/CON, reposition" },
    { value: "lucky", label: "Lucky", helper: "3 reroll dice" },
    { value: "sentinel", label: "Sentinel", helper: "Lock foes in melee" },
    { value: "war-caster", label: "War Caster", helper: "Concentration advantage" },
];

export const SUBCLASS_OPTIONS: Record<string, SelectOption[]> = {
    Barbarian: [
        { value: "path-of-the-berserker", label: "Path of the Berserker" },
        { value: "path-of-the-ancestral-guardian", label: "Path of the Ancestral Guardian" },
    ],
    Bard: [
        { value: "college-of-lore", label: "College of Lore" },
        { value: "college-of-valor", label: "College of Valor" },
        { value: "college-of-glamour", label: "College of Glamour" },
    ],
    Cleric: [
        { value: "life-domain", label: "Life Domain" },
        { value: "light-domain", label: "Light Domain" },
        { value: "trickery-domain", label: "Trickery Domain" },
    ],
    Fighter: [
        { value: "battle-master", label: "Battle Master" },
        { value: "eldritch-knight", label: "Eldritch Knight" },
        { value: "champion", label: "Champion" },
    ],
    Rogue: [
        { value: "arcane-trickster", label: "Arcane Trickster" },
        { value: "assassin", label: "Assassin" },
        { value: "swashbuckler", label: "Swashbuckler" },
    ],
    Wizard: [
        { value: "school-of-evocation", label: "School of Evocation" },
        { value: "school-of-divination", label: "School of Divination" },
        { value: "school-of-abjuration", label: "School of Abjuration" },
    ],
};

export function getSubclassOptions(className?: string | null) {
    if (!className) {
        return [] as SelectOption[];
    }

    return SUBCLASS_OPTIONS[className] ?? [];
}
