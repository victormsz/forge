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
    // Origin Feats
    { value: "alert", label: "Alert", helper: "Initiative proficiency + swap" },
    { value: "magic-initiate", label: "Magic Initiate", helper: "2 cantrips + 1 level 1 spell" },
    { value: "savage-attacker", label: "Savage Attacker", helper: "Reroll weapon damage once/turn" },
    { value: "skilled", label: "Skilled", helper: "3 skill/tool proficiencies" },

    // General Feats
    { value: "ability-score-improvement", label: "Ability Score Improvement", helper: "+2 to one or +1 to two scores" },
    { value: "grappler", label: "Grappler", helper: "+1 STR/DEX, improved grappling" },

    // Fighting Style Feats
    { value: "archery", label: "Archery", helper: "+2 to ranged attack rolls" },
    { value: "defense", label: "Defense", helper: "+1 AC in armor" },
    { value: "great-weapon-fighting", label: "Great Weapon Fighting", helper: "Reroll 1-2 on damage dice" },
    { value: "two-weapon-fighting", label: "Two Weapon Fighting", helper: "Add modifier to offhand damage" },

    // Epic Boons (Level 19+)
    { value: "boon-of-combat-prowess", label: "Boon of Combat Prowess", helper: "+1 score, miss→hit ability" },
    { value: "boon-of-dimensional-travel", label: "Boon of Dimensional Travel", helper: "+1 score, teleport 30ft" },
    { value: "boon-of-fate", label: "Boon of Fate", helper: "+1 score, alter d20 tests" },
    { value: "boon-of-irresistible-offense", label: "Boon of Irresistible Offense", helper: "+1 score, ignore resistance" },
    { value: "boon-of-spell-recall", label: "Boon of Spell Recall", helper: "+1 score, free casting chance" },
    { value: "boon-of-the-night-spirit", label: "Boon of the Night Spirit", helper: "+1 score, shadow abilities" },
    { value: "boon-of-truesight", label: "Boon of Truesight", helper: "+1 score, 60ft truesight" },
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
