export interface FeatPrerequisite {
    ability_score?: {
        index: string;
        name: string;
        url: string;
    };
    minimum_score?: number;
}

export interface FeatInfo {
    index: string;
    name: string;
    prerequisites?: FeatPrerequisite[];
    desc: string[];
    abilityBonus?: string; // "choice" or specific ability like "str"
}

// Comprehensive feat descriptions (2024 D&D rules where applicable)
const FEAT_DATABASE: Record<string, FeatInfo> = {
    "alert": {
        index: "alert",
        name: "Alert",
        desc: [
            "Always on the lookout for danger, you gain the following benefits:",
            "• Initiative Proficiency: When you roll initiative, you can add your proficiency bonus to the roll.",
            "• Initiative Swap: Immediately after you roll initiative, you can swap your initiative with one willing ally in the same combat. You can't make this swap if you or the ally is incapacitated."
        ],
        abilityBonus: "choice"
    },
    "magic-initiate": {
        index: "magic-initiate",
        name: "Magic Initiate",
        desc: [
            "You learn two cantrips and one 1st-level spell from a class spell list of your choice.",
            "You can cast the 1st-level spell once per long rest without expending a spell slot.",
            "Your spellcasting ability for these spells is Intelligence, Wisdom, or Charisma (choose when you select this feat)."
        ],
        abilityBonus: "choice"
    },
    "savage-attacker": {
        index: "savage-attacker",
        name: "Savage Attacker",
        desc: [
            "You've trained to deal particularly damaging strikes. Once per turn when you hit with a weapon, you can reroll the weapon's damage dice and use either result."
        ],
        abilityBonus: "choice"
    },
    "skilled": {
        index: "skilled",
        name: "Skilled",
        desc: [
            "You gain proficiency in any combination of three skills or tools of your choice."
        ],
        abilityBonus: "choice"
    },
    "ability-score-improvement": {
        index: "ability-score-improvement",
        name: "Ability Score Improvement",
        desc: [
            "Increase one ability score of your choice by 2, or increase two ability scores of your choice by 1.",
            "As normal, you can't increase an ability score above 20 using this feature."
        ]
    },
    "grappler": {
        index: "grappler",
        name: "Grappler",
        desc: [
            "You've developed the skills necessary to hold your own in close-quarters grappling. You gain the following benefits:",
            "• Ability Score Increase: Increase your Strength or Dexterity by 1, to a maximum of 20.",
            "• Attack Advantage: You have advantage on attack rolls against a creature you are grappling.",
            "• Fast Wrestler: You can use a Bonus Action to try to grapple a creature, or to try to escape from being grappled."
        ],
        abilityBonus: "str-or-dex"
    },
    "archery": {
        index: "archery",
        name: "Archery",
        desc: [
            "You gain a +2 bonus to attack rolls you make with ranged weapons."
        ],
        abilityBonus: "choice"
    },
    "defense": {
        index: "defense",
        name: "Defense",
        desc: [
            "While you are wearing armor, you gain a +1 bonus to AC."
        ],
        abilityBonus: "choice"
    },
    "great-weapon-fighting": {
        index: "great-weapon-fighting",
        name: "Great Weapon Fighting",
        desc: [
            "When you roll a 1 or 2 on a damage die for an attack you make with a melee weapon that you are wielding with two hands, you can reroll the die.",
            "You must use the new roll, even if it is a 1 or 2.",
            "The weapon must have the two-handed or versatile property for you to gain this benefit."
        ],
        abilityBonus: "choice"
    },
    "two-weapon-fighting": {
        index: "two-weapon-fighting",
        name: "Two Weapon Fighting",
        desc: [
            "When you engage in two-weapon fighting, you can add your ability modifier to the damage of the second attack."
        ],
        abilityBonus: "choice"
    },
    "boon-of-combat-prowess": {
        index: "boon-of-combat-prowess",
        name: "Boon of Combat Prowess",
        desc: [
            "Increase one ability score of your choice by 1, to a maximum of 20.",
            "When you miss with an attack roll, you can choose to hit instead. Once you use this benefit, you can't use it again until you finish a short or long rest."
        ],
        abilityBonus: "choice"
    },
    "boon-of-dimensional-travel": {
        index: "boon-of-dimensional-travel",
        name: "Boon of Dimensional Travel",
        desc: [
            "Increase one ability score of your choice by 1, to a maximum of 20.",
            "As a bonus action, you can teleport up to 30 feet to an unoccupied space you can see."
        ],
        abilityBonus: "choice"
    },
    "boon-of-fate": {
        index: "boon-of-fate",
        name: "Boon of Fate",
        desc: [
            "Increase one ability score of your choice by 1, to a maximum of 20.",
            "When another creature that you can see within 60 feet of you makes a d20 Test, you can use your reaction to roll a d10 and add or subtract it from the result.",
            "Once you use this reaction, you can't use it again until you finish a short or long rest."
        ],
        abilityBonus: "choice"
    },
    "boon-of-irresistible-offense": {
        index: "boon-of-irresistible-offense",
        name: "Boon of Irresistible Offense",
        desc: [
            "Increase one ability score of your choice by 1, to a maximum of 20.",
            "You can bypass the damage resistances and immunities of creatures."
        ],
        abilityBonus: "choice"
    },
    "boon-of-spell-recall": {
        index: "boon-of-spell-recall",
        name: "Boon of Spell Recall",
        desc: [
            "Increase one ability score of your choice by 1, to a maximum of 20.",
            "When you cast a spell using a spell slot, you can roll a d6. If you roll a 6, the spell slot isn't expended."
        ],
        abilityBonus: "choice"
    },
    "boon-of-the-night-spirit": {
        index: "boon-of-the-night-spirit",
        name: "Boon of the Night Spirit",
        desc: [
            "Increase one ability score of your choice by 1, to a maximum of 20.",
            "You gain the following benefits:",
            "• You have advantage on Dexterity (Stealth) checks.",
            "• While you are entirely in an area of dim light or darkness, you have resistance to all damage."
        ],
        abilityBonus: "choice"
    },
    "boon-of-truesight": {
        index: "boon-of-truesight",
        name: "Boon of Truesight",
        desc: [
            "Increase one ability score of your choice by 1, to a maximum of 20.",
            "You gain truesight out to a range of 60 feet."
        ],
        abilityBonus: "choice"
    }
};

export function getFeatByIndex(index: string): FeatInfo | null {
    return FEAT_DATABASE[index] || null;
}

export function getFeatDescription(index: string): string {
    const feat = getFeatByIndex(index);
    if (!feat) return "";

    return feat.desc.join("\n\n");
}

export function featGrantsAbilityBonus(index: string): boolean {
    const feat = getFeatByIndex(index);
    return Boolean(feat?.abilityBonus);
}
