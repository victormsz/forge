"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { DragEvent } from "react";
import { useFormStatus } from "react-dom";

import type { AbilityKey, AbilityScores } from "@/lib/point-buy";
import {
    ABILITY_KEYS,
    DEFAULT_ABILITY_SCORES,
    MAX_ABILITY_SCORE,
    MIN_ABILITY_SCORE,
    POINT_BUY_BUDGET,
    RANDOM_MAX_ABILITY_SCORE,
    RANDOM_MIN_ABILITY_SCORE,
    calculatePointBuyCost,
    getIncrementalPointCost,
} from "@/lib/point-buy";
import type { ClassOption } from "@/lib/classes/load-classes";
import { getClassOptions } from "@/lib/classes/load-classes";
import { getBackgroundBonuses, applyBackgroundBonus } from "@/lib/characters/background-bonuses";
import { getAncestryBonuses, applyAncestryBonuses } from "@/lib/characters/ancestry-bonuses";
import { abilityModifier, formatModifier } from "@/lib/characters/statistics";
import equipmentCategoriesData from "@/db/2014/5e-SRD-Equipment-Categories.json";

type AbilityGenerationMethod = "POINT_BUY" | "RANDOM";

interface CreateCharacterWizardProps {
    action: (formData: FormData) => void;
}

const abilityOptions: { label: string; value: AbilityGenerationMethod; description: string }[] = [
    {
        label: "Point Buy",
        value: "POINT_BUY",
        description: "Plan every stat with a 27-point budget and variant rules.",
    },
    {
        label: "Random Rolls",
        value: "RANDOM",
        description: "Trust the dice gods with 4d6 drop-lowest ability rolls.",
    },
];

const SKILL_LIST = [
    "Acrobatics",
    "Animal Handling",
    "Arcana",
    "Athletics",
    "Deception",
    "History",
    "Insight",
    "Intimidation",
    "Investigation",
    "Medicine",
    "Nature",
    "Perception",
    "Performance",
    "Persuasion",
    "Religion",
    "Sleight of Hand",
    "Stealth",
    "Survival",
];

type ProficiencyCategory = "armor" | "weapons" | "tools" | "skills" | "languages";

interface ProficiencyBlock {
    armor: string[];
    weapons: string[];
    tools: string[];
    skills: string[];
    languages: string[];
}

const EMPTY_PROFICIENCIES: ProficiencyBlock = {
    armor: [],
    weapons: [],
    tools: [],
    skills: [],
    languages: [],
};

const PROFICIENCY_LABELS: Record<ProficiencyCategory, string> = {
    armor: "Armor",
    weapons: "Weapons",
    tools: "Tools",
    skills: "Skills",
    languages: "Languages",
};

interface BaseOption<T extends string = string> {
    label: string;
    value: T;
    description: string;
    detail?: string;
}

interface AncestryOption extends BaseOption {
    detail: string;
    proficiencies: ProficiencyBlock;
}

interface BackgroundOption extends BaseOption {
    detail: string;
    proficiencies: ProficiencyBlock;
}

// ClassOption interface is now imported from @/lib/classes/load-classes

function dedupeList(values: string[]) {
    return Array.from(new Set(values.filter((value) => value && value.trim().length > 0))).map((value) => value.trim());
}

const ancestryOptions: AncestryOption[] = [
    {
        label: "Human",
        value: "Human",
        description: "Adaptable excellence across every class.",
        detail: "Humans thrive in any environment, picking up regional tricks and diplomatic savvy in equal measure.\n\n**Ability Bonuses:** +1 to all ability scores\n**Speed:** 30 ft.\n**Size:** Medium (5-6 ft. tall)\n**Age:** Reach adulthood in late teens, live less than a century\n\n**Traits:**\n• Versatile talent that adapts to any role\n• Quick learners who master diverse skills\n• Natural diplomats bridging cultural divides",
        proficiencies: {
            ...EMPTY_PROFICIENCIES,
            languages: ["Common", "One additional language of your choice"],
        },
    },
    {
        label: "Elf",
        value: "Elf",
        description: "Graceful experts with sharp minds and senses.",
        detail: "Elven lineages gift keen senses, a trance-like meditative rest, and timeless lore passed down in song.\n\n**Ability Bonuses:** +2 Dexterity\n**Speed:** 30 ft.\n**Size:** Medium (5-6 ft. tall, slender builds)\n**Age:** Claim adulthood around 100, live to 750 years\n\n**Traits:**\n• **Darkvision:** See in dim light within 60 ft. as if bright light\n• **Keen Senses:** Proficiency in Perception\n• **Fey Ancestry:** Advantage on saves vs. charm, magic can't put you to sleep\n• **Trance:** Meditate 4 hours instead of sleeping 8 hours",
        proficiencies: {
            ...EMPTY_PROFICIENCIES,
            skills: ["Perception"],
            languages: ["Common", "Elvish"],
        },
    },
    {
        label: "Dwarf",
        value: "Dwarf",
        description: "Stalwart defenders with deep artisan roots.",
        detail: "Dwarves train from childhood with tools and axes, bolstered by hearty constitutions and clan oaths.\n\n**Ability Bonuses:** +2 Constitution\n**Speed:** 25 ft. (not reduced by armor)\n**Size:** Medium (4-5 ft. tall, ~150 lbs)\n**Age:** Considered young until 50, live about 350 years\n\n**Traits:**\n• **Darkvision:** See in dim light within 60 ft. as if bright light\n• **Dwarven Resilience:** Advantage on saves vs. poison, resistance to poison damage\n• **Dwarven Combat Training:** Proficiency with battleaxe, handaxe, light hammer, warhammer\n• **Stonecunning:** Double proficiency on History checks related to stonework",
        proficiencies: {
            ...EMPTY_PROFICIENCIES,
            weapons: ["Battleaxes", "Handaxes", "Light hammers", "Warhammers"],
            tools: ["One type of artisan's tools (smith, brewer, or mason)"],
            languages: ["Common", "Dwarvish"],
        },
    },
    {
        label: "Halfling",
        value: "Halfling",
        description: "Lucky nimble souls who dodge danger.",
        detail: "Halflings blend optimism with supernatural luck, slipping past giants and calamity with a grin.\n\n**Ability Bonuses:** +2 Dexterity\n**Speed:** 25 ft.\n**Size:** Small (~3 ft. tall, ~40 lbs)\n**Age:** Reach adulthood at 20, live into their second century\n\n**Traits:**\n• **Lucky:** Reroll any attack roll, ability check, or save that rolls a 1\n• **Brave:** Advantage on saves against being frightened\n• **Halfling Nimbleness:** Move through space of creatures larger than you\n• Natural optimism and good-hearted kindness",
        proficiencies: {
            ...EMPTY_PROFICIENCIES,
            languages: ["Common", "Halfling"],
        },
    },
    {
        label: "Dragonborn",
        value: "Dragonborn",
        description: "Heritage of dragons, breath weapons included.",
        detail: "Draconic ancestry fuels elemental breath, proud honor codes, and intimidating presence on any battlefield.\n\n**Ability Bonuses:** +2 Strength, +1 Charisma\n**Speed:** 30 ft.\n**Size:** Medium (6+ ft. tall, ~250 lbs)\n**Age:** Reach adulthood by 15, live to around 80\n\n**Traits:**\n• **Draconic Ancestry:** Choose dragon type for breath weapon and damage resistance\n• **Breath Weapon:** Exhale destructive energy (2d6 damage, recharge on short/long rest)\n• **Damage Resistance:** Resist damage type associated with your ancestry\n• Proud clan honor and unwavering loyalty",
        proficiencies: {
            ...EMPTY_PROFICIENCIES,
            languages: ["Common", "Draconic"],
        },
    },
    {
        label: "Gnome",
        value: "Gnome",
        description: "Inventive tinkerers with sharp minds.",
        detail: "Gnomes combine curiosity with cunning, excelling at magic and mechanics with centuries of accumulated wisdom.\n\n**Ability Bonuses:** +2 Intelligence\n**Speed:** 25 ft.\n**Size:** Small (3-4 ft. tall, ~40 lbs)\n**Age:** Settle into adult life around 40, live 350-500 years\n\n**Traits:**\n• **Darkvision:** See in dim light within 60 ft. as if bright light\n• **Gnome Cunning:** Advantage on Int, Wis, and Cha saves against magic\n• Boundless enthusiasm for learning and invention\n• Good-hearted nature, even the tricksters among them",
        proficiencies: {
            ...EMPTY_PROFICIENCIES,
            languages: ["Common", "Gnomish"],
        },
    },
    {
        label: "Half-Elf",
        value: "Half-Elf",
        description: "Charismatic blend of two worlds.",
        detail: "Half-elves inherit elven grace and human ambition, thriving in social situations and adapting to any role.\n\n**Ability Bonuses:** +2 Charisma, +1 to two other abilities\n**Speed:** 30 ft.\n**Size:** Medium (5-6 ft. tall)\n**Age:** Reach adulthood around 20, often exceed 180 years\n\n**Traits:**\n• **Darkvision:** See in dim light within 60 ft. as if bright light\n• **Fey Ancestry:** Advantage on saves vs. charm, magic can't put you to sleep\n• **Skill Versatility:** Proficiency in two skills of your choice\n• Bridge between two worlds with adaptable nature",
        proficiencies: {
            ...EMPTY_PROFICIENCIES,
            skills: ["Choose any two skills"],
            languages: ["Common", "Elvish", "One additional language of your choice"],
        },
    },
    {
        label: "Half-Orc",
        value: "Half-Orc",
        description: "Relentless strength and savage endurance.",
        detail: "Half-orcs combine orcish might with human versatility, refusing to fall and striking devastating blows.\n\n**Ability Bonuses:** +2 Strength, +1 Constitution\n**Speed:** 30 ft.\n**Size:** Medium (5-6+ ft. tall, larger & bulkier than humans)\n**Age:** Mature by 14, rarely live longer than 75 years\n\n**Traits:**\n• **Darkvision:** See in dim light within 60 ft. as if bright light\n• **Relentless Endurance:** Drop to 1 HP instead of 0 once per long rest\n• **Savage Attacks:** Roll one extra weapon damage die on critical hits\n• **Menacing:** Proficiency in Intimidation",
        proficiencies: {
            ...EMPTY_PROFICIENCIES,
            skills: ["Intimidation"],
            languages: ["Common", "Orc"],
        },
    },
    {
        label: "Tiefling",
        value: "Tiefling",
        description: "Infernal heritage with innate magic.",
        detail: "Tieflings carry devilish blood that grants fire resistance and dark spellcasting, often facing prejudice with defiance.\n\n**Ability Bonuses:** +2 Charisma, +1 Intelligence\n**Speed:** 30 ft.\n**Size:** Medium (same size as humans)\n**Age:** Mature at same rate as humans, live a few years longer\n\n**Traits:**\n• **Darkvision:** See in dim light within 60 ft. as if bright light\n• **Hellish Resistance:** Resistance to fire damage\n• **Infernal Legacy:** Know thaumaturgy cantrip; at 3rd level cast hellish rebuke; at 5th level cast darkness\n• Independent spirit inclined toward chaotic alignments",
        proficiencies: {
            ...EMPTY_PROFICIENCIES,
            languages: ["Common", "Infernal"],
        },
    },
];

const backgroundOptions: BackgroundOption[] = [
    {
        label: "Acolyte",
        value: "Acolyte",
        description: "Raised by the temple.",
        detail: "You know liturgies, sacred calendars, and have pull within your faith's hierarchy for shelter or aid.\n\n**Ability Score Increases:** Choose one from INT, WIS, or CHA\n**Feat:** Magic Initiate (Cleric) - Learn cleric cantrips and 1st-level spells\n\n**Proficiencies:**\n• **Skills:** Insight, Religion\n• **Tools:** Calligrapher's Supplies\n\n**Starting Equipment Choice:**\n• **Option A:** Holy symbol, prayer book, calligrapher's supplies, 10 parchment, robe, 8 gp\n• **Option B:** 50 gp to buy your own equipment\n\n**Background Feature:** Command respect among faithful, receive free healing at temples, and call upon priests for assistance when near your temple.",
        proficiencies: {
            ...EMPTY_PROFICIENCIES,
            skills: ["Insight", "Religion"],
            tools: ["Calligrapher's Supplies"],
        },
    },
    {
        label: "Criminal",
        value: "Criminal",
        description: "Cunning outlaw with underworld ties.",
        detail: "You lived outside the law, developing skills in deception, stealth, and the darker trades of civilization.\n\n**Ability Score Increases:** Choose one from DEX, CON, or INT\n**Feat:** Alert - +5 to initiative, can't be surprised while conscious\n\n**Proficiencies:**\n• **Skills:** Sleight of Hand, Stealth\n• **Tools:** Thieves' Tools\n\n**Starting Equipment Choice:**\n• **Option A:** 2 daggers, thieves' tools, crowbar, 2 pouches, traveler's clothes, 16 gp\n• **Option B:** 50 gp to buy your own equipment\n\n**Background Feature:** Connections in the criminal underworld provide you with reliable contacts for fencing goods, gathering information, or finding safe houses.",
        proficiencies: {
            ...EMPTY_PROFICIENCIES,
            skills: ["Sleight of Hand", "Stealth"],
            tools: ["Thieves' Tools"],
        },
    },
    {
        label: "Sage",
        value: "Sage",
        description: "Archivist of esoteric lore.",
        detail: "Years in libraries honed your memory for obscure myths, planar theory, and ancient scripts.\n\n**Ability Score Increases:** Choose one from CON, INT, or WIS\n**Feat:** Magic Initiate (Wizard) - Learn wizard cantrips and 1st-level spells\n\n**Proficiencies:**\n• **Skills:** Arcana, History\n• **Tools:** Calligrapher's Supplies\n\n**Starting Equipment Choice:**\n• **Option A:** Quarterstaff, calligrapher's supplies, history book, 8 parchment, robe, 8 gp\n• **Option B:** 50 gp to buy your own equipment\n\n**Background Feature:** Your extensive studies grant you access to libraries and repositories of knowledge. You know where to find information and can often recall obscure facts.",
        proficiencies: {
            ...EMPTY_PROFICIENCIES,
            skills: ["Arcana", "History"],
            tools: ["Calligrapher's Supplies"],
        },
    },
    {
        label: "Soldier",
        value: "Soldier",
        description: "Campaign-hardened veteran.",
        detail: "You drilled in formations, know army jargon, and can still call in favors from your old unit.\n\n**Ability Score Increases:** Choose one from STR, DEX, or CON\n**Feat:** Savage Attacker - Reroll weapon damage dice once per turn\n\n**Proficiencies:**\n• **Skills:** Athletics, Intimidation\n• **Tools:** Choose one gaming set (dice, dragonchess, playing cards, or three-dragon ante)\n\n**Starting Equipment Choice:**\n• **Option A:** Spear, shortbow, 20 arrows, gaming set, healer's kit, quiver, traveler's clothes, 14 gp\n• **Option B:** 50 gp to buy your own equipment\n\n**Background Feature:** Your military rank earns you respect. You can leverage your military connections to access fortresses, requisition simple equipment, or gain audiences with officers.",
        proficiencies: {
            ...EMPTY_PROFICIENCIES,
            skills: ["Athletics", "Intimidation"],
            tools: ["One gaming set of your choice"],
        },
    },
    {
        label: "Outlander",
        value: "Outlander",
        description: "Warden of the wilds.",
        detail: "You can always find food and know hidden trails thanks to seasons spent tracking beasts and storms.\n\n**Proficiencies:**\n• **Skills:** Athletics, Survival\n• **Tools:** One musical instrument\n• **Languages:** One of your choice\n\n**Background Feature:** You have excellent memory for maps and geography. You can find food and water for yourself and up to five others each day in the wilderness.",
        proficiencies: {
            ...EMPTY_PROFICIENCIES,
            skills: ["Athletics", "Survival"],
            tools: ["One musical instrument"],
            languages: ["One additional language"],
        },
    },
    {
        label: "Noble",
        value: "Noble",
        description: "Court-savvy aristocrat.",
        detail: "Diplomacy, etiquette, and heraldry are second nature, and household retainers still recognize your crest.\n\n**Proficiencies:**\n• **Skills:** History, Persuasion\n• **Tools:** One gaming set\n• **Languages:** One of your choice\n\n**Background Feature:** Your noble birth grants you a position of privilege. People assume you have the right to be wherever you are. You can secure audiences with nobility and gain favor in high society.",
        proficiencies: {
            ...EMPTY_PROFICIENCIES,
            skills: ["History", "Persuasion"],
            tools: ["One gaming set"],
            languages: ["One additional language"],
        },
    },
];

const alignmentOptions = [
    { label: "Lawful Good", value: "Lawful Good", description: "Orderly altruist upholding codes." },
    { label: "Neutral Good", value: "Neutral Good", description: "Helps others without rigid rules." },
    { label: "Chaotic Good", value: "Chaotic Good", description: "Follows conscience over laws." },
    { label: "Lawful Neutral", value: "Lawful Neutral", description: "Prioritizes structure and duty." },
    { label: "True Neutral", value: "True Neutral", description: "Balances forces without bias." },
    { label: "Chaotic Neutral", value: "Chaotic Neutral", description: "Values freedom above all." },
    { label: "Lawful Evil", value: "Lawful Evil", description: "Manipulates systems for gain." },
    { label: "Neutral Evil", value: "Neutral Evil", description: "Self-serving opportunist." },
    { label: "Chaotic Evil", value: "Chaotic Evil", description: "Sows destruction for personal whim." },
];

const classOptions = getClassOptions();

// Helper to expand equipment category to actual equipment options
function expandEquipmentCategory(categoryIndex: string): any[] {
    const category = (equipmentCategoriesData as any[]).find((cat: any) => cat.index === categoryIndex);
    if (!category || !category.equipment) {
        return [];
    }
    return category.equipment.map((equip: any) => ({
        option_type: "counted_reference",
        count: 1,
        of: {
            index: equip.index,
            name: equip.name,
            url: equip.url,
        },
    }));
}

const abilityMeta: Record<AbilityKey, { label: string; summary: string }> = {
    str: { label: "Strength", summary: "Melee damage and athletics" },
    dex: { label: "Dexterity", summary: "Initiative, AC, stealth" },
    con: { label: "Constitution", summary: "Hit points and endurance" },
    int: { label: "Intelligence", summary: "Arcana, investigation" },
    wis: { label: "Wisdom", summary: "Perception, spell DCs" },
    cha: { label: "Charisma", summary: "Social checks, spell DCs" },
};

const baseSteps = [
    { id: "core", title: "Core Details", description: "Name your hero and choose ability generation." },
    { id: "ancestry", title: "Choose Ancestry", description: "Pick the people and culture that shaped them." },
    { id: "background", title: "Select Background", description: "Ground them in a life before adventuring." },
    { id: "class", title: "Select Class", description: "Lock their primary toolkit for adventures." },
    { id: "subclass", title: "Choose Subclass", description: "Select your specialization or divine domain." },
    { id: "equipment", title: "Starting Equipment", description: "Choose your initial gear and weapons." },
    { id: "alignment", title: "Set Alignment", description: "Capture their guiding ethos." },
];

const randomAbilityStep = {
    id: "random-abilities",
    title: "Roll Ability Scores",
    description: "Drop 4d6 sets, keep the highest three, and slot totals into your stats.",
};

const MIN_NAME_LENGTH = 2;

interface RolledSet {
    id: string;
    dice: number[];
    keptTotal: number;
    droppedIndex: number;
}

type RollAssignments = Record<string, AbilityKey | null>;

const RANDOM_ROLL_COUNT = 6;

function generateRollId() {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
        return crypto.randomUUID();
    }
    return `roll-${Math.random().toString(36).slice(2)}`;
}

function rollFourDSixDropLowest(): RolledSet {
    const dice = Array.from({ length: 4 }, () => Math.floor(Math.random() * 6) + 1);
    const sorted = dice
        .map((value, index) => ({ value, index }))
        .sort((a, b) => (a.value === b.value ? a.index - b.index : a.value - b.value));
    const droppedIndex = sorted[0].index;
    const keptTotal = dice.reduce((total, value, index) => (index === droppedIndex ? total : total + value), 0);

    return {
        id: generateRollId(),
        dice,
        keptTotal,
        droppedIndex,
    };
}

function createManualScoreState(seed?: AbilityScores) {
    return ABILITY_KEYS.reduce((acc, ability) => {
        const value = seed?.[ability];
        acc[ability] = typeof value === "number" ? String(value) : "";
        return acc;
    }, {} as Record<AbilityKey, string>);
}

interface WizardFormState {
    name: string;
    method: AbilityGenerationMethod;
    ancestry: string;
    charClass: string;
    subclass: string;
    background: string;
    alignment: string;
    abilityScores: AbilityScores;
    selectedSkills: string[];
    equipmentChoices: Record<number, number>; // Maps equipment option index to selected choice index
    ancestryAbilityChoices: Partial<Record<AbilityKey, number>>;
    backgroundAbilityChoice: string;
}

function SubmitButton({ disabled }: { disabled: boolean }) {
    const { pending } = useFormStatus();
    return (
        <button
            type="submit"
            disabled={disabled || pending}
            className="w-full rounded-2xl bg-rose-400 px-6 py-3 text-sm font-semibold uppercase tracking-wide text-black transition hover:bg-rose-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
            {pending ? "Forging..." : "Forge character"}
        </button>
    );
}

export function CreateCharacterWizard({ action }: CreateCharacterWizardProps) {
    const [step, setStep] = useState(0);
    const [formState, setFormState] = useState<WizardFormState>(() => ({
        name: "",
        method: abilityOptions[0].value,
        ancestry: "",
        charClass: "",
        subclass: "",
        background: "",
        alignment: "",
        abilityScores: { ...DEFAULT_ABILITY_SCORES },
        ancestryAbilityChoices: {},
        backgroundAbilityChoice: "",
        selectedSkills: [],
        equipmentChoices: {},
    }));
    const [rolledSets, setRolledSets] = useState<RolledSet[]>([]);
    const [rollAssignments, setRollAssignments] = useState<RollAssignments>({});
    const [draggedRollId, setDraggedRollId] = useState<string | null>(null);
    const [manualEntryMode, setManualEntryMode] = useState(false);
    const [manualScores, setManualScores] = useState<Record<AbilityKey, string>>(() => createManualScoreState());
    const [hoveredAncestry, setHoveredAncestry] = useState<string | null>(null);
    const [hoveredBackground, setHoveredBackground] = useState<string | null>(null);

    const isPointBuy = formState.method === "POINT_BUY";

    const activeSteps = useMemo(() => {
        if (formState.method === "RANDOM") {
            return [baseSteps[0], randomAbilityStep, ...baseSteps.slice(1)];
        }
        return baseSteps;
    }, [formState.method]);

    const currentStep = activeSteps[step] ?? activeSteps[activeSteps.length - 1];

    const totalPointBuySpent = useMemo(
        () => (isPointBuy ? calculatePointBuyCost(formState.abilityScores) : 0),
        [isPointBuy, formState.abilityScores],
    );
    const pointsRemaining = POINT_BUY_BUDGET - totalPointBuySpent;
    const pointBuyBudgetValid = !isPointBuy || pointsRemaining >= 0;

    const rollLookup = useMemo(() => {
        const map = new Map<string, RolledSet>();
        rolledSets.forEach((roll) => {
            map.set(roll.id, roll);
        });
        return map;
    }, [rolledSets]);

    const rollByAbility = useMemo(() => {
        const map: Partial<Record<AbilityKey, string>> = {};
        Object.entries(rollAssignments).forEach(([rollId, assignedAbility]) => {
            if (assignedAbility) {
                map[assignedAbility] = rollId;
            }
        });
        return map;
    }, [rollAssignments]);

    const manualEntryValid = manualEntryMode
        ? ABILITY_KEYS.every((ability) => {
            const rawValue = manualScores[ability]?.trim();
            if (!rawValue) {
                return false;
            }
            const numericValue = Number(rawValue);
            return (
                Number.isFinite(numericValue) &&
                numericValue >= RANDOM_MIN_ABILITY_SCORE &&
                numericValue <= RANDOM_MAX_ABILITY_SCORE
            );
        })
        : true;

    const diceAssignmentsComplete = ABILITY_KEYS.every((ability) => Boolean(rollByAbility[ability]));
    const randomStepComplete = manualEntryMode ? manualEntryValid : diceAssignmentsComplete;
    const randomAssignmentsComplete = formState.method !== "RANDOM" || randomStepComplete;
    const generationReady = formState.method === "POINT_BUY" ? pointBuyBudgetValid : randomAssignmentsComplete;

    const methodLabel = abilityOptions.find((option) => option.value === formState.method)?.label ?? abilityOptions[0].label;
    const progress = ((step + 1) / activeSteps.length) * 100;

    // Calculate combined proficiencies from all sources
    const combinedProficiencies = useMemo(() => {
        const result: ProficiencyBlock = {
            armor: [],
            weapons: [],
            tools: [],
            skills: [],
            languages: [],
        };

        // Add ancestry proficiencies
        const selectedAncestry = ancestryOptions.find((a) => a.value === formState.ancestry);
        if (selectedAncestry) {
            result.armor.push(...selectedAncestry.proficiencies.armor);
            result.weapons.push(...selectedAncestry.proficiencies.weapons);
            result.tools.push(...selectedAncestry.proficiencies.tools);
            result.skills.push(...selectedAncestry.proficiencies.skills);
            result.languages.push(...selectedAncestry.proficiencies.languages);
        }

        // Add background proficiencies
        const selectedBackground = backgroundOptions.find((b) => b.value === formState.background);
        if (selectedBackground) {
            result.armor.push(...selectedBackground.proficiencies.armor);
            result.weapons.push(...selectedBackground.proficiencies.weapons);
            result.tools.push(...selectedBackground.proficiencies.tools);
            result.skills.push(...selectedBackground.proficiencies.skills);
            result.languages.push(...selectedBackground.proficiencies.languages);
        }

        // Add class proficiencies
        const selectedClass = classOptions.find((c) => c.value === formState.charClass);
        if (selectedClass) {
            result.armor.push(...selectedClass.proficiencies.armor);
            result.weapons.push(...selectedClass.proficiencies.weapons);
            result.tools.push(...selectedClass.proficiencies.tools);
            result.skills.push(...selectedClass.proficiencies.skills.fixed);
            // Add selected skills from class choices
            result.skills.push(...formState.selectedSkills);
        }

        // Deduplicate all proficiencies
        result.armor = dedupeList(result.armor);
        result.weapons = dedupeList(result.weapons);
        result.tools = dedupeList(result.tools);
        result.skills = dedupeList(result.skills);
        result.languages = dedupeList(result.languages);

        return result;
    }, [formState.ancestry, formState.background, formState.charClass, formState.selectedSkills]);

    // Calculate final ability scores with all bonuses applied
    const finalAbilityScores = useMemo(() => {
        let scores = { ...formState.abilityScores };

        // Apply ancestry bonuses
        scores = applyAncestryBonuses(scores, formState.ancestry, formState.ancestryAbilityChoices);

        // Apply background bonus
        scores = applyBackgroundBonus(scores, formState.background, formState.backgroundAbilityChoice as AbilityKey);

        return scores;
    }, [formState.abilityScores, formState.ancestry, formState.ancestryAbilityChoices, formState.background, formState.backgroundAbilityChoice]);

    // Calculate available skill choices from class
    const availableSkillChoices = useMemo(() => {
        const selectedClass = classOptions.find((c) => c.value === formState.charClass);
        if (!selectedClass?.proficiencies.skills.choices) {
            return null;
        }
        return selectedClass.proficiencies.skills.choices;
    }, [formState.charClass]);

    // Auto-select first valid background ability choice when background changes
    useEffect(() => {
        if (formState.background) {
            const bgBonuses = getBackgroundBonuses(formState.background);
            if (bgBonuses && bgBonuses.choices.length > 0) {
                const firstChoice = bgBonuses.choices[0];
                setFormState((prev) => {
                    if (prev.backgroundAbilityChoice !== firstChoice) {
                        return {
                            ...prev,
                            backgroundAbilityChoice: firstChoice,
                        };
                    }
                    return prev;
                });
            }
        }
    }, [formState.background]);

    const resetAbilityScoresToDefault = useCallback(() => {
        setFormState((prev) => ({ ...prev, abilityScores: { ...DEFAULT_ABILITY_SCORES } }));
    }, [setFormState]);

    const handleManualScoreChange = useCallback(
        (ability: AbilityKey, rawValue: string) => {
            const sanitized = rawValue.replace(/[^0-9]/g, "");
            setManualScores((prev) => ({ ...prev, [ability]: sanitized }));
            if (sanitized === "") {
                setFormState((prev) => {
                    if (prev.method !== "RANDOM") {
                        return prev;
                    }
                    return {
                        ...prev,
                        abilityScores: { ...prev.abilityScores, [ability]: DEFAULT_ABILITY_SCORES[ability] },
                    };
                });
                return;
            }
            const numericValue = Number(sanitized);
            if (!Number.isFinite(numericValue)) {
                return;
            }
            const clamped = Math.max(
                RANDOM_MIN_ABILITY_SCORE,
                Math.min(RANDOM_MAX_ABILITY_SCORE, numericValue),
            );
            setFormState((prev) => {
                if (prev.method !== "RANDOM") {
                    return prev;
                }
                return {
                    ...prev,
                    abilityScores: { ...prev.abilityScores, [ability]: clamped },
                };
            });
        },
        [setManualScores, setFormState],
    );

    const rollAllPools = useCallback(() => {
        if (formState.method !== "RANDOM") {
            return;
        }

        const pools = Array.from({ length: RANDOM_ROLL_COUNT }, () => rollFourDSixDropLowest());
        const assignments: RollAssignments = {};
        pools.forEach((pool) => {
            assignments[pool.id] = null;
        });

        setRolledSets(pools);
        setRollAssignments(assignments);
        setDraggedRollId(null);
        resetAbilityScoresToDefault();
    }, [formState.method, resetAbilityScoresToDefault]);

    const resetRandomAssignments = useCallback(() => {
        setRolledSets([]);
        setRollAssignments({});
        setDraggedRollId(null);
    }, []);


    const assignRollToAbility = useCallback(
        (rollId: string, ability: AbilityKey) => {
            if (manualEntryMode) {
                return;
            }
            const roll = rollLookup.get(rollId);
            if (!roll) {
                return;
            }

            const updatedAssignments: RollAssignments = { ...rollAssignments };
            if (updatedAssignments[rollId] === ability) {
                return;
            }

            const previousAbilityForRoll = updatedAssignments[rollId];
            Object.entries(updatedAssignments).forEach(([id, assignedAbility]) => {
                if (id !== rollId && assignedAbility === ability) {
                    updatedAssignments[id] = null;
                }
            });

            updatedAssignments[rollId] = ability;
            setRollAssignments(updatedAssignments);

            setFormState((prev) => {
                if (prev.method !== "RANDOM") {
                    return prev;
                }
                const nextScores: AbilityScores = { ...prev.abilityScores };
                if (previousAbilityForRoll) {
                    nextScores[previousAbilityForRoll] = DEFAULT_ABILITY_SCORES[previousAbilityForRoll];
                }
                nextScores[ability] = roll.keptTotal;
                return { ...prev, abilityScores: nextScores };
            });
        },
        [manualEntryMode, rollAssignments, rollLookup, setFormState],
    );

    const clearAbilitySlot = useCallback(
        (ability: AbilityKey) => {
            if (manualEntryMode) {
                return;
            }
            const updatedAssignments: RollAssignments = { ...rollAssignments };
            let mutated = false;
            Object.entries(updatedAssignments).forEach(([rollId, assignedAbility]) => {
                if (assignedAbility === ability) {
                    updatedAssignments[rollId] = null;
                    mutated = true;
                }
            });

            if (!mutated) {
                return;
            }

            setRollAssignments(updatedAssignments);
            setFormState((prev) => {
                if (prev.method !== "RANDOM") {
                    return prev;
                }
                return {
                    ...prev,
                    abilityScores: { ...prev.abilityScores, [ability]: DEFAULT_ABILITY_SCORES[ability] },
                };
            });
        },
        [manualEntryMode, rollAssignments, setFormState],
    );

    const handleRollDragStart = useCallback((event: DragEvent<HTMLDivElement>, rollId: string) => {
        event.dataTransfer.setData("text/plain", rollId);
        event.dataTransfer.effectAllowed = "move";
        setDraggedRollId(rollId);
    }, []);

    const handleAbilityDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
    }, []);

    const handleAbilityDrop = useCallback(
        (event: DragEvent<HTMLDivElement>, ability: AbilityKey) => {
            event.preventDefault();
            const rollId = event.dataTransfer.getData("text/plain");
            if (!rollId) {
                return;
            }
            assignRollToAbility(rollId, ability);
            setDraggedRollId(null);
        },
        [assignRollToAbility],
    );

    const toggleManualEntryMode = () => {
        if (formState.method !== "RANDOM") {
            return;
        }
        if (manualEntryMode) {
            setManualEntryMode(false);
            setManualScores(createManualScoreState());
            resetAbilityScoresToDefault();
            resetRandomAssignments();
            rollAllPools();
            return;
        }
        setManualEntryMode(true);
        setManualScores(createManualScoreState());
        resetAbilityScoresToDefault();
        resetRandomAssignments();
    };

    const handleNext = () => {
        if (!canAdvance) {
            return;
        }
        setStep((prev) => {
            let nextIndex = Math.min(prev + 1, activeSteps.length - 1);

            // Auto-roll dice pools when entering random abilities step
            if (
                activeSteps[nextIndex]?.id === "random-abilities" &&
                !manualEntryMode &&
                rolledSets.length === 0
            ) {
                rollAllPools();
            }

            // Skip subclass step if the selected class has no subclasses
            if (activeSteps[nextIndex]?.id === "subclass") {
                const selectedClass = classOptions.find((c) => c.value === formState.charClass);
                if (!selectedClass?.subclasses || selectedClass.subclasses.length === 0) {
                    // Skip to next step
                    nextIndex = Math.min(nextIndex + 1, activeSteps.length - 1);
                }
            }

            // Skip equipment step if there are no equipment choices
            if (activeSteps[nextIndex]?.id === "equipment") {
                const selectedClass = classOptions.find((c) => c.value === formState.charClass);
                const equipmentOptions = selectedClass?.startingEquipmentOptions || [];
                if (equipmentOptions.length === 0) {
                    // Skip to next step
                    nextIndex = Math.min(nextIndex + 1, activeSteps.length - 1);
                }
            }

            return nextIndex;
        });
    };

    const handleBack = () => {
        if (step === 0) {
            return;
        }

        const current = activeSteps[step];
        if (current?.id === "random-abilities") {
            resetRandomAssignments();
            resetAbilityScoresToDefault();
            setManualEntryMode(false);
            setManualScores(createManualScoreState());
        }

        setStep((prev) => {
            let prevIndex = Math.max(prev - 1, 0);

            // Skip subclass step backward if the selected class has no subclasses
            if (activeSteps[prevIndex]?.id === "subclass") {
                const selectedClass = classOptions.find((c) => c.value === formState.charClass);
                if (!selectedClass?.subclasses || selectedClass.subclasses.length === 0) {
                    // Skip to previous step
                    prevIndex = Math.max(prevIndex - 1, 0);
                }
            }

            // Skip equipment step backward if there are no equipment choices
            if (activeSteps[prevIndex]?.id === "equipment") {
                const selectedClass = classOptions.find((c) => c.value === formState.charClass);
                const equipmentOptions = selectedClass?.startingEquipmentOptions || [];
                if (equipmentOptions.length === 0) {
                    // Skip to previous step
                    prevIndex = Math.max(prevIndex - 1, 0);
                }
            }

            return prevIndex;
        });
    };

    const canAdvance = (() => {
        if (!currentStep) {
            return false;
        }

        switch (currentStep.id) {
            case "core":
                return formState.name.trim().length >= MIN_NAME_LENGTH && (isPointBuy ? pointBuyBudgetValid : true);
            case "random-abilities":
                return randomAssignmentsComplete;
            case "ancestry":
                return Boolean(formState.ancestry);
            case "background":
                if (!formState.background) {
                    return false;
                }
                // Check if background ability choice is made when required
                const bgBonuses = getBackgroundBonuses(formState.background);
                if (bgBonuses && bgBonuses.choices.length > 0) {
                    return Boolean(formState.backgroundAbilityChoice);
                }
                return true;
            case "class": {
                if (!formState.charClass) {
                    return false;
                }
                // Check if skill selections are complete
                const selectedClass = classOptions.find((c) => c.value === formState.charClass);
                const skillChoices = selectedClass?.proficiencies.skills.choices;
                if (skillChoices) {
                    return formState.selectedSkills.length === skillChoices.count;
                }
                return true;
            }
            case "subclass": {
                const selectedClass = classOptions.find((c) => c.value === formState.charClass);
                // If class has no subclasses, skip this step
                if (!selectedClass?.subclasses || selectedClass.subclasses.length === 0) {
                    return true;
                }
                return Boolean(formState.subclass);
            }
            case "equipment": {
                const selectedClass = classOptions.find((c) => c.value === formState.charClass);
                if (!selectedClass) {
                    return false;
                }
                // If there are no equipment choices, auto-advance
                const equipmentOptions = selectedClass.startingEquipmentOptions || [];
                if (equipmentOptions.length === 0) {
                    return true;
                }
                // Check if all equipment choices have been made
                return equipmentOptions.every((_, index) =>
                    formState.equipmentChoices[index] !== undefined
                );
            }
            case "alignment":
                return Boolean(formState.alignment);
            default:
                return true;
        }
    })();

    const canSubmit = (() => {
        const selectedClass = classOptions.find((c) => c.value === formState.charClass);
        const needsSubclass = selectedClass?.subclasses && selectedClass.subclasses.length > 0;
        const skillChoices = selectedClass?.proficiencies.skills.choices;
        const needsSkillSelection = skillChoices && formState.selectedSkills.length !== skillChoices.count;
        const equipmentOptions = selectedClass?.startingEquipmentOptions || [];
        const needsEquipmentSelection = equipmentOptions.length > 0 &&
            !equipmentOptions.every((_, index) => formState.equipmentChoices[index] !== undefined);

        return (
            formState.name.trim().length >= MIN_NAME_LENGTH &&
            Boolean(formState.ancestry) &&
            Boolean(formState.background) &&
            Boolean(formState.charClass) &&
            (!needsSubclass || Boolean(formState.subclass)) &&
            Boolean(formState.alignment) &&
            generationReady &&
            !needsSkillSelection &&
            !needsEquipmentSelection
        );
    })();

    const adjustAbilityScore = (ability: AbilityKey, delta: 1 | -1) => {
        if (!isPointBuy) {
            return;
        }

        setFormState((prev) => {
            const currentValue = prev.abilityScores[ability];
            const nextValue = currentValue + delta;

            if (nextValue < MIN_ABILITY_SCORE || nextValue > MAX_ABILITY_SCORE) {
                return prev;
            }

            const updatedScores: AbilityScores = {
                ...prev.abilityScores,
                [ability]: nextValue,
            };

            if (calculatePointBuyCost(updatedScores) > POINT_BUY_BUDGET) {
                return prev;
            }

            return { ...prev, abilityScores: updatedScores };
        });
    };

    return (
        <form action={action} className="mt-2 flex flex-col gap-6" aria-labelledby="character-wizard-title">
            <input type="hidden" name="name" value={formState.name} />
            <input type="hidden" name="method" value={formState.method} />
            <input type="hidden" name="ancestry" value={formState.ancestry} />
            <input type="hidden" name="class" value={formState.charClass} />
            <input type="hidden" name="subclass" value={formState.subclass} />
            <input type="hidden" name="background" value={formState.background} />
            <input type="hidden" name="alignment" value={formState.alignment} />
            <input type="hidden" name="abilityScores" value={JSON.stringify(formState.abilityScores)} />
            <input type="hidden" name="selectedSkills" value={JSON.stringify(formState.selectedSkills)} />
            <input type="hidden" name="equipmentChoices" value={JSON.stringify(formState.equipmentChoices)} />
            <input type="hidden" name="ancestryAbilityChoices" value={JSON.stringify(formState.ancestryAbilityChoices)} />
            <input type="hidden" name="backgroundAbilityChoice" value={formState.backgroundAbilityChoice} />
            <div className="space-y-6">
                <section className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/10 to-white/0 p-6 shadow-lg">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-rose-200">Live preview</p>
                            <h2 className="text-3xl font-semibold text-white">{formState.name.trim() || "Unnamed hero"}</h2>
                        </div>
                        <p className="text-xs uppercase tracking-[0.3em] text-white/60">
                            Step {String(step + 1).padStart(2, "0")} / {String(activeSteps.length).padStart(2, "0")}
                        </p>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                            <p className="text-[0.6rem] uppercase tracking-[0.4em] text-white/60">Ability Method</p>
                            <p className="mt-1 text-lg font-semibold text-white">{methodLabel}</p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                            <p className="text-[0.6rem] uppercase tracking-[0.4em] text-white/60">Ancestry</p>
                            <p className="mt-1 text-lg font-semibold text-white">{formState.ancestry || "Pending"}</p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                            <p className="text-[0.6rem] uppercase tracking-[0.4em] text-white/60">Class</p>
                            <p className="mt-1 text-lg font-semibold text-white">{formState.charClass || "Pending"}</p>
                            {formState.subclass && (
                                <p className="mt-1 text-xs text-white/60">{formState.subclass}</p>
                            )}
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                            <p className="text-[0.6rem] uppercase tracking-[0.4em] text-white/60">Background</p>
                            <p className="mt-1 text-lg font-semibold text-white">{formState.background || "Pending"}</p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                            <p className="text-[0.6rem] uppercase tracking-[0.4em] text-white/60">Alignment</p>
                            <p className="mt-1 text-lg font-semibold text-white">{formState.alignment || "Pending"}</p>
                        </div>
                    </div>
                    <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {ABILITY_KEYS.map((ability) => {
                            const baseScore = formState.abilityScores[ability];
                            const finalScore = finalAbilityScores[ability];
                            const modifier = abilityModifier(finalScore);
                            const hasBonus = baseScore !== finalScore;

                            return (
                                <div key={ability} className="rounded-2xl border border-white/10 bg-black/20 p-3">
                                    <p className="text-[0.55rem] uppercase tracking-[0.35em] text-white/50">{abilityMeta[ability].label}</p>
                                    <div className="mt-1 flex items-baseline gap-2">
                                        <p className="text-2xl font-semibold text-white">{finalScore}</p>
                                        <p className="text-xs text-white/50">{ability.toUpperCase()}</p>
                                    </div>
                                    <div className="mt-1 flex items-center gap-2">
                                        <p className={`text-sm font-medium ${modifier >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            {formatModifier(modifier)}
                                        </p>
                                        {hasBonus && (
                                            <p className="text-xs text-rose-300">
                                                ({baseScore} + {finalScore - baseScore})
                                            </p>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {(combinedProficiencies.skills.length > 0 ||
                        combinedProficiencies.armor.length > 0 ||
                        combinedProficiencies.weapons.length > 0 ||
                        combinedProficiencies.tools.length > 0 ||
                        combinedProficiencies.languages.length > 0) && (
                            <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
                                <p className="text-[0.6rem] uppercase tracking-[0.4em] text-white/60 mb-3">Proficiencies & Skills</p>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    {combinedProficiencies.skills.length > 0 && (
                                        <div>
                                            <p className="text-xs font-semibold text-rose-200 mb-1">Skills</p>
                                            <p className="text-xs text-white/70 leading-relaxed">{combinedProficiencies.skills.join(", ")}</p>
                                        </div>
                                    )}
                                    {combinedProficiencies.armor.length > 0 && (
                                        <div>
                                            <p className="text-xs font-semibold text-rose-200 mb-1">Armor</p>
                                            <p className="text-xs text-white/70 leading-relaxed">{combinedProficiencies.armor.join(", ")}</p>
                                        </div>
                                    )}
                                    {combinedProficiencies.weapons.length > 0 && (
                                        <div>
                                            <p className="text-xs font-semibold text-rose-200 mb-1">Weapons</p>
                                            <p className="text-xs text-white/70 leading-relaxed">{combinedProficiencies.weapons.join(", ")}</p>
                                        </div>
                                    )}
                                    {combinedProficiencies.tools.length > 0 && (
                                        <div>
                                            <p className="text-xs font-semibold text-rose-200 mb-1">Tools</p>
                                            <p className="text-xs text-white/70 leading-relaxed">{combinedProficiencies.tools.join(", ")}</p>
                                        </div>
                                    )}
                                    {combinedProficiencies.languages.length > 0 && (
                                        <div>
                                            <p className="text-xs font-semibold text-rose-200 mb-1">Languages</p>
                                            <p className="text-xs text-white/70 leading-relaxed">{combinedProficiencies.languages.join(", ")}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                    <div className="mt-6 h-2 w-full rounded-full bg-white/10">
                        <div className="h-full rounded-full bg-rose-400 transition-all" style={{ width: `${progress}%` }} />
                    </div>
                </section>

                <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
                    <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">{currentStep.title}</p>
                        <p className="text-sm text-white/70">{currentStep.description}</p>
                    </div>

                    {currentStep.id === "core" && (
                        <div className="mt-6 space-y-4">
                            <label className="flex w-full flex-col text-sm font-semibold uppercase tracking-wide text-white/70">
                                Hero name
                                <input
                                    type="text"
                                    name="display-name"
                                    placeholder="E.g. Nyx Stormveil"
                                    value={formState.name}
                                    onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
                                    className="mt-2 rounded-2xl border border-white/15 bg-black/40 px-4 py-3 text-base font-normal text-white placeholder:text-white/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
                                />
                            </label>
                            <div className="grid gap-3 md:grid-cols-2">
                                {abilityOptions.map((option) => (
                                    <button
                                        type="button"
                                        key={option.value}
                                        onClick={() => {
                                            if (formState.method === option.value) {
                                                return;
                                            }
                                            resetRandomAssignments();
                                            setManualEntryMode(false);
                                            setManualScores(createManualScoreState());
                                            setFormState((prev) => ({
                                                ...prev,
                                                method: option.value,
                                                abilityScores: { ...DEFAULT_ABILITY_SCORES },
                                            }));
                                            setStep(0);
                                        }}
                                        className={`rounded-2xl border px-4 py-4 text-left transition ${formState.method === option.value
                                            ? "border-rose-300 bg-rose-300/10"
                                            : "border-white/15 bg-black/30 hover:border-white/30"
                                            }`}
                                    >
                                        <p className="text-sm font-semibold text-white">{option.label}</p>
                                        <p className="mt-1 text-xs text-white/70">{option.description}</p>
                                    </button>
                                ))}
                            </div>
                            {isPointBuy && (
                                <div className="rounded-3xl border border-white/10 bg-black/40 p-5">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div>
                                            <p className="text-xs uppercase tracking-[0.35em] text-white/60">Point buy pool</p>
                                            <p className={`text-xl font-semibold ${pointsRemaining >= 0 ? "text-white" : "text-rose-300"}`}>
                                                {pointsRemaining} pts remaining
                                            </p>
                                        </div>
                                        <p className="text-xs text-white/60">
                                            Scores stay between {MIN_ABILITY_SCORE} and {MAX_ABILITY_SCORE} following the PHB cost curve.
                                        </p>
                                    </div>
                                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                        {ABILITY_KEYS.map((ability) => {
                                            const score = formState.abilityScores[ability];
                                            const incrementCost = getIncrementalPointCost(score);
                                            const canDecrease = score > MIN_ABILITY_SCORE;
                                            const canIncrease = incrementCost !== Infinity && incrementCost <= pointsRemaining;

                                            return (
                                                <div key={ability} className="rounded-2xl border border-white/15 bg-black/50 p-4">
                                                    <p className="text-[0.6rem] uppercase tracking-[0.35em] text-white/60">
                                                        {abilityMeta[ability].label}
                                                    </p>
                                                    <p className="text-xs text-white/50">{abilityMeta[ability].summary}</p>
                                                    <div className="mt-4 flex items-center gap-3">
                                                        <button
                                                            type="button"
                                                            onClick={() => adjustAbilityScore(ability, -1)}
                                                            disabled={!canDecrease}
                                                            className="rounded-full border border-white/20 px-2 py-1 text-sm text-white transition hover:border-white/40 disabled:cursor-not-allowed disabled:opacity-40"
                                                            aria-label={`Decrease ${abilityMeta[ability].label}`}
                                                        >
                                                            -
                                                        </button>
                                                        <div className="flex flex-col items-center text-white">
                                                            <span className="text-3xl font-semibold">{score}</span>
                                                            {incrementCost !== Infinity && (
                                                                <span className="text-[0.6rem] uppercase tracking-[0.3em] text-white/50">
                                                                    +{incrementCost} pts
                                                                </span>
                                                            )}
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => adjustAbilityScore(ability, 1)}
                                                            disabled={!canIncrease}
                                                            className="rounded-full border border-white/20 px-2 py-1 text-sm text-white transition hover:border-white/40 disabled:cursor-not-allowed disabled:opacity-40"
                                                            aria-label={`Increase ${abilityMeta[ability].label}`}
                                                        >
                                                            +
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {currentStep.id === "random-abilities" && (
                        <div className="mt-6 space-y-6">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                <div className="rounded-2xl border border-white/15 bg-black/30 p-5 text-sm text-white/70">
                                    <p>
                                        Six pools of 4d6 roll at once when you advance from Core Details. Each pool shows four dice with the
                                        lowest die automatically faded and removed from the total.
                                    </p>
                                    <p className="mt-2 text-xs text-white/60">
                                        Drag any total onto the stat cards below to lock it in or switch to manual entry if you already have your
                                        rolls.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={toggleManualEntryMode}
                                    className="rounded-full border border-white/20 px-5 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:border-rose-300 hover:text-rose-200"
                                >
                                    {manualEntryMode ? "Use generated pools" : "I will roll them myself"}
                                </button>
                            </div>

                            {manualEntryMode ? (
                                <div className="rounded-2xl border border-white/15 bg-black/40 p-6">
                                    <div className="flex flex-col gap-2 text-sm text-white/70">
                                        <p>Type each ability result you rolled. We will keep everything between {RANDOM_MIN_ABILITY_SCORE} and {RANDOM_MAX_ABILITY_SCORE}.</p>
                                        {!manualEntryValid && (
                                            <p className="text-xs text-rose-200">
                                                Enter six totals between {RANDOM_MIN_ABILITY_SCORE} and {RANDOM_MAX_ABILITY_SCORE} to continue.
                                            </p>
                                        )}
                                    </div>
                                    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                        {ABILITY_KEYS.map((ability) => {
                                            const value = manualScores[ability] ?? "";
                                            const trimmed = value.trim();
                                            const numericValue = trimmed === "" ? NaN : Number(trimmed);
                                            const hasError =
                                                trimmed !== "" &&
                                                (!Number.isFinite(numericValue) ||
                                                    numericValue < RANDOM_MIN_ABILITY_SCORE ||
                                                    numericValue > RANDOM_MAX_ABILITY_SCORE);
                                            return (
                                                <label key={ability} className={`flex flex-col rounded-2xl border px-4 py-4 ${hasError ? "border-rose-400 bg-rose-400/10" : "border-white/15 bg-black/40"}`}>
                                                    <span className="text-[0.6rem] uppercase tracking-[0.35em] text-white/60">
                                                        {abilityMeta[ability].label}
                                                    </span>
                                                    <span className="text-xs text-white/50">{abilityMeta[ability].summary}</span>
                                                    <input
                                                        type="text"
                                                        inputMode="numeric"
                                                        pattern="[0-9]*"
                                                        value={value}
                                                        onChange={(event) => handleManualScoreChange(ability, event.target.value)}
                                                        placeholder="--"
                                                        className="mt-3 rounded-2xl border border-white/20 bg-black/50 px-4 py-3 text-center text-2xl font-semibold text-white placeholder:text-white/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
                                                    />
                                                    <span className="mt-1 text-[0.55rem] uppercase tracking-[0.3em] text-white/50">
                                                        {RANDOM_MIN_ABILITY_SCORE}-{RANDOM_MAX_ABILITY_SCORE}
                                                    </span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : rolledSets.length === 0 ? (
                                <div className="rounded-2xl border border-white/10 bg-black/40 p-6 text-center text-sm text-white/70">
                                    Click Next on the previous step to roll your dice pools.
                                </div>
                            ) : (
                                <div className="flex flex-col gap-6 lg:flex-row">
                                    <div className="lg:w-5/12">
                                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                                            {rolledSets.map((roll, index) => {
                                                const assignedAbility = rollAssignments[roll.id];
                                                return (
                                                    <div
                                                        key={roll.id}
                                                        className={`group rounded-2xl border px-4 py-4 transition ${assignedAbility ? "border-rose-300 bg-rose-300/5" : "border-white/15 bg-black/40"}`}
                                                        draggable
                                                        onDragStart={(event) => handleRollDragStart(event, roll.id)}
                                                        onDragEnd={() => setDraggedRollId(null)}
                                                    >
                                                        <div className="flex items-center justify-between text-[0.6rem] uppercase tracking-[0.35em] text-white/60">
                                                            <span>Pool {String(index + 1).padStart(2, "0")}</span>
                                                            <span>{assignedAbility ? abilityMeta[assignedAbility].label : "Unassigned"}</span>
                                                        </div>
                                                        <div className="mt-3 flex gap-2">
                                                            {roll.dice.map((dieValue, dieIndex) => (
                                                                <div
                                                                    key={`${roll.id}-die-${dieIndex}`}
                                                                    className={`flex h-12 w-12 items-center justify-center rounded-xl border text-lg font-semibold text-white ${dieIndex === roll.droppedIndex
                                                                        ? "border-dashed border-white/30 bg-black/10 text-white/30"
                                                                        : "border-white/30 bg-white/10"
                                                                        }`}
                                                                >
                                                                    {dieValue}
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <p className="mt-3 text-sm text-white/80">
                                                            <span className="text-2xl font-semibold text-white">{roll.keptTotal}</span> total after drop-lowest
                                                        </p>
                                                        <p className="text-[0.6rem] uppercase tracking-[0.4em] text-white/50">Drag onto a stat</p>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    <div className="flex-1 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                        {ABILITY_KEYS.map((ability) => {
                                            const assignedRollId = rollByAbility[ability];
                                            const assignedRoll = assignedRollId ? rollLookup.get(assignedRollId) : undefined;
                                            const isActiveDrop = Boolean(draggedRollId) && !assignedRoll;

                                            return (
                                                <div
                                                    key={ability}
                                                    onDragOver={handleAbilityDragOver}
                                                    onDrop={(event) => handleAbilityDrop(event, ability)}
                                                    className={`rounded-2xl border p-4 transition ${assignedRoll
                                                        ? "border-rose-300 bg-rose-300/10"
                                                        : isActiveDrop
                                                            ? "border-white/40 bg-white/10"
                                                            : "border-white/15 bg-black/40"
                                                        }`}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <p className="text-[0.6rem] uppercase tracking-[0.35em] text-white/60">
                                                                {abilityMeta[ability].label}
                                                            </p>
                                                            <p className="text-xs text-white/50">{abilityMeta[ability].summary}</p>
                                                        </div>
                                                        {assignedRoll && (
                                                            <button
                                                                type="button"
                                                                onClick={() => clearAbilitySlot(ability)}
                                                                className="rounded-full border border-white/20 px-3 py-1 text-[0.55rem] uppercase tracking-[0.3em] text-white/70 transition hover:border-white/40"
                                                            >
                                                                Clear
                                                            </button>
                                                        )}
                                                    </div>
                                                    <div className="mt-4 text-center text-4xl font-semibold text-white">
                                                        {assignedRoll ? assignedRoll.keptTotal : "--"}
                                                    </div>
                                                    <p className="mt-1 text-center text-xs text-white/60">
                                                        {assignedRoll ? "Locked from pool" : "Drop a roll here"}
                                                    </p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {currentStep.id === "ancestry" && (
                        <div className="mt-6 flex flex-col gap-6 lg:flex-row">
                            <div className="grid flex-1 gap-3 md:grid-cols-2">
                                {ancestryOptions.map((option) => {
                                    const active = formState.ancestry === option.value;
                                    return (
                                        <button
                                            type="button"
                                            key={option.value}
                                            onClick={() => setFormState((prev) => ({ ...prev, ancestry: option.value }))}
                                            onMouseEnter={() => setHoveredAncestry(option.value)}
                                            onMouseLeave={() => setHoveredAncestry(null)}
                                            onFocus={() => setHoveredAncestry(option.value)}
                                            className={`rounded-2xl border px-4 py-4 text-left transition ${active ? "border-rose-300 bg-rose-300/10" : "border-white/15 bg-black/30 hover:border-white/30"
                                                }`}
                                        >
                                            <p className="text-sm font-semibold text-white">{option.label}</p>
                                            <p className="mt-1 text-xs text-white/70">{option.description}</p>
                                        </button>
                                    );
                                })}
                            </div>
                            <div className="lg:w-1/3">
                                {(() => {
                                    const insight = ancestryOptions.find((option) => option.value === (hoveredAncestry ?? formState.ancestry)) ?? ancestryOptions[0];
                                    const detailParts = insight.detail.split('\n\n');

                                    return (
                                        <div className="rounded-2xl border border-white/15 bg-black/30 p-5 overflow-y-auto max-h-[600px]">
                                            <p className="text-[0.6rem] uppercase tracking-[0.35em] text-white/60">Ancestry Details</p>
                                            <p className="mt-2 text-lg font-semibold text-white">{insight.label}</p>

                                            <div className="mt-3 space-y-3">
                                                {detailParts.map((part, idx) => {
                                                    if (part.startsWith('**')) {
                                                        // Format stat blocks (Ability Bonuses, Speed, Size, Age)
                                                        const lines = part.split('\n');
                                                        return (
                                                            <div key={idx} className="text-xs space-y-1">
                                                                {lines.map((line, lineIdx) => {
                                                                    const match = line.match(/\*\*(.*?):\*\*(.*)/);
                                                                    if (match) {
                                                                        return (
                                                                            <div key={lineIdx} className="flex gap-2">
                                                                                <span className="font-semibold text-rose-300 min-w-[100px]">{match[1]}:</span>
                                                                                <span className="text-white/80">{match[2].trim()}</span>
                                                                            </div>
                                                                        );
                                                                    }
                                                                    return null;
                                                                })}
                                                            </div>
                                                        );
                                                    } else if (part.includes('•')) {
                                                        // Format trait lists
                                                        const lines = part.split('\n').filter(l => l.trim());
                                                        return (
                                                            <div key={idx} className="text-xs space-y-1.5">
                                                                {lines.map((line, lineIdx) => {
                                                                    if (line.includes('•')) {
                                                                        const match = line.match(/• \*\*(.*?):\*\*(.*)/);
                                                                        if (match) {
                                                                            return (
                                                                                <div key={lineIdx} className="flex gap-2">
                                                                                    <span className="text-white/50">•</span>
                                                                                    <div>
                                                                                        <span className="font-semibold text-white">{match[1]}: </span>
                                                                                        <span className="text-white/70">{match[2].trim()}</span>
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        }
                                                                        return (
                                                                            <div key={lineIdx} className="flex gap-2">
                                                                                <span className="text-white/50">•</span>
                                                                                <span className="text-white/70">{line.replace('•', '').trim()}</span>
                                                                            </div>
                                                                        );
                                                                    }
                                                                    return null;
                                                                })}
                                                            </div>
                                                        );
                                                    } else {
                                                        // Regular paragraph
                                                        return (
                                                            <p key={idx} className="text-sm text-white/70 leading-relaxed">
                                                                {part}
                                                            </p>
                                                        );
                                                    }
                                                })}
                                            </div>

                                            {insight.proficiencies && (
                                                <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
                                                    <p className="text-[0.6rem] uppercase tracking-[0.35em] text-white/60">Proficiencies</p>
                                                    {insight.proficiencies.skills.length > 0 && (
                                                        <div className="text-xs">
                                                            <span className="font-semibold text-rose-300">Skills: </span>
                                                            <span className="text-white/70">{insight.proficiencies.skills.join(', ')}</span>
                                                        </div>
                                                    )}
                                                    {insight.proficiencies.weapons.length > 0 && (
                                                        <div className="text-xs">
                                                            <span className="font-semibold text-rose-300">Weapons: </span>
                                                            <span className="text-white/70">{insight.proficiencies.weapons.join(', ')}</span>
                                                        </div>
                                                    )}
                                                    {insight.proficiencies.tools.length > 0 && (
                                                        <div className="text-xs">
                                                            <span className="font-semibold text-rose-300">Tools: </span>
                                                            <span className="text-white/70">{insight.proficiencies.tools.join(', ')}</span>
                                                        </div>
                                                    )}
                                                    {insight.proficiencies.languages.length > 0 && (
                                                        <div className="text-xs">
                                                            <span className="font-semibold text-rose-300">Languages: </span>
                                                            <span className="text-white/70">{insight.proficiencies.languages.join(', ')}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            <p className="mt-4 text-xs text-white/40 italic">Hover or focus a race to update.</p>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    )}

                    {currentStep.id === "background" && (
                        <div className="mt-6 space-y-6">
                            <div className="flex flex-col gap-6 lg:flex-row">
                                <div className="grid flex-1 gap-3 md:grid-cols-2">
                                    {backgroundOptions.map((option) => {
                                        const active = formState.background === option.value;
                                        return (
                                            <button
                                                type="button"
                                                key={option.value}
                                                onClick={() => setFormState((prev) => ({ ...prev, background: option.value }))}
                                                onMouseEnter={() => setHoveredBackground(option.value)}
                                                onMouseLeave={() => setHoveredBackground(null)}
                                                onFocus={() => setHoveredBackground(option.value)}
                                                className={`rounded-2xl border px-4 py-4 text-left transition ${active ? "border-rose-300 bg-rose-300/10" : "border-white/15 bg-black/30 hover:border-white/30"
                                                    }`}
                                            >
                                                <p className="text-sm font-semibold text-white">{option.label}</p>
                                                <p className="mt-1 text-xs text-white/70">{option.description}</p>
                                            </button>
                                        );
                                    })}
                                </div>
                                <div className="lg:w-1/3">
                                    {(() => {
                                        const insight =
                                            backgroundOptions.find((option) => option.value === (hoveredBackground ?? formState.background)) ??
                                            backgroundOptions[0];
                                        const detailParts = insight.detail.split('\n\n');

                                        return (
                                            <div className="rounded-2xl border border-white/15 bg-black/30 p-5 overflow-y-auto max-h-[600px]">
                                                <p className="text-[0.6rem] uppercase tracking-[0.35em] text-white/60">Background Details</p>
                                                <p className="mt-2 text-lg font-semibold text-white">{insight.label}</p>

                                                <div className="mt-3 space-y-3">
                                                    {detailParts.map((part, idx) => {
                                                        if (part.startsWith('**')) {
                                                            // Format stat blocks
                                                            const lines = part.split('\n');
                                                            return (
                                                                <div key={idx} className="text-xs space-y-1">
                                                                    {lines.map((line, lineIdx) => {
                                                                        const match = line.match(/\*\*(.*?):\*\*(.*)/);
                                                                        if (match) {
                                                                            return (
                                                                                <div key={lineIdx} className="flex gap-2">
                                                                                    <span className="font-semibold text-rose-300 min-w-[130px]">{match[1]}:</span>
                                                                                    <span className="text-white/80">{match[2].trim()}</span>
                                                                                </div>
                                                                            );
                                                                        }
                                                                        return null;
                                                                    })}
                                                                </div>
                                                            );
                                                        } else if (part.includes('•')) {
                                                            // Format proficiency lists
                                                            const lines = part.split('\n').filter(l => l.trim());
                                                            return (
                                                                <div key={idx} className="text-xs space-y-1.5">
                                                                    {lines.map((line, lineIdx) => {
                                                                        if (line.includes('•')) {
                                                                            const match = line.match(/• \*\*(.*?):\*\*(.*)/);
                                                                            if (match) {
                                                                                return (
                                                                                    <div key={lineIdx} className="flex gap-2">
                                                                                        <span className="text-white/50">•</span>
                                                                                        <div>
                                                                                            <span className="font-semibold text-white">{match[1]}: </span>
                                                                                            <span className="text-white/70">{match[2].trim()}</span>
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            }
                                                                            return (
                                                                                <div key={lineIdx} className="flex gap-2">
                                                                                    <span className="text-white/50">•</span>
                                                                                    <span className="text-white/70">{line.replace('•', '').trim()}</span>
                                                                                </div>
                                                                            );
                                                                        }
                                                                        return null;
                                                                    })}
                                                                </div>
                                                            );
                                                        } else {
                                                            // Regular paragraph
                                                            return (
                                                                <p key={idx} className="text-sm text-white/70 leading-relaxed">
                                                                    {part}
                                                                </p>
                                                            );
                                                        }
                                                    })}
                                                </div>

                                                {insight.proficiencies && (
                                                    <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
                                                        <p className="text-[0.6rem] uppercase tracking-[0.35em] text-white/60">Additional Info</p>
                                                        {insight.proficiencies.skills.length > 0 && (
                                                            <div className="text-xs">
                                                                <span className="font-semibold text-rose-300">Skill Proficiencies: </span>
                                                                <span className="text-white/70">{insight.proficiencies.skills.join(', ')}</span>
                                                            </div>
                                                        )}
                                                        {insight.proficiencies.tools.length > 0 && (
                                                            <div className="text-xs">
                                                                <span className="font-semibold text-rose-300">Tool Proficiencies: </span>
                                                                <span className="text-white/70">{insight.proficiencies.tools.join(', ')}</span>
                                                            </div>
                                                        )}
                                                        {insight.proficiencies.languages.length > 0 && (
                                                            <div className="text-xs">
                                                                <span className="font-semibold text-rose-300">Languages: </span>
                                                                <span className="text-white/70">{insight.proficiencies.languages.join(', ')}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                <p className="mt-4 text-xs text-white/40 italic">Hover or focus a background to update.</p>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>

                            {formState.background && (() => {
                                const bgBonuses = getBackgroundBonuses(formState.background);
                                if (!bgBonuses || bgBonuses.choices.length <= 1) {
                                    return null;
                                }

                                return (
                                    <div className="rounded-2xl border border-white/15 bg-black/30 p-5">
                                        <p className="text-[0.6rem] uppercase tracking-[0.35em] text-white/60">Ability Score Increase</p>
                                        <p className="mt-2 text-sm text-white/70">
                                            Choose which ability score to increase by +{bgBonuses.amount}:
                                        </p>
                                        <div className="mt-4 flex flex-wrap gap-3">
                                            {bgBonuses.choices.map((ability) => {
                                                const isSelected = formState.backgroundAbilityChoice === ability;
                                                const meta = abilityMeta[ability];

                                                return (
                                                    <button
                                                        key={ability}
                                                        type="button"
                                                        onClick={() => setFormState((prev) => ({ ...prev, backgroundAbilityChoice: ability }))}
                                                        className={`flex-1 min-w-[140px] rounded-2xl border px-4 py-3 text-left transition ${isSelected
                                                            ? "border-rose-300 bg-rose-300/10"
                                                            : "border-white/15 bg-black/40 hover:border-white/30"
                                                            }`}
                                                    >
                                                        <p className="text-sm font-semibold text-white">
                                                            {meta.label}
                                                            {isSelected && <span className="ml-2 text-rose-300">✓</span>}
                                                        </p>
                                                        <p className="mt-1 text-xs text-white/60">{meta.summary}</p>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    )}

                    {currentStep.id === "class" && (
                        <div className="mt-6 flex flex-col gap-6 lg:flex-row">
                            <div className="grid gap-3 md:grid-cols-3 lg:w-2/3">
                                {classOptions.map((option) => {
                                    const active = formState.charClass === option.value;
                                    return (
                                        <button
                                            type="button"
                                            key={option.value}
                                            onClick={() => setFormState((prev) => ({ ...prev, charClass: option.value, subclass: "", selectedSkills: [] }))}
                                            onMouseEnter={() => setHoveredBackground(option.value)}
                                            onMouseLeave={() => setHoveredBackground(null)}
                                            onFocus={() => setHoveredBackground(option.value)}
                                            onBlur={() => setHoveredBackground(null)}
                                            className={`rounded-2xl border px-4 py-4 text-left transition ${active ? "border-rose-300 bg-rose-300/10" : "border-white/15 bg-black/30 hover:border-white/30"
                                                }`}
                                        >
                                            <p className="text-sm font-semibold text-white">{option.label}</p>
                                            <p className="mt-1 text-xs text-white/70">{option.description}</p>
                                            <div className="mt-2 flex items-center gap-2 text-[0.6rem] uppercase tracking-[0.3em] text-white/50">
                                                <span>d{option.hitDie} HD</span>
                                                <span>•</span>
                                                <span>{option.savingThrows.join(", ")}</span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                            <div className="lg:w-1/3">
                                {(() => {
                                    const selectedClass =
                                        classOptions.find((option) => option.value === (hoveredBackground ?? formState.charClass)) ??
                                        classOptions[0];

                                    const hasSkillChoices = selectedClass.proficiencies.skills.choices;
                                    const hasFixedSkills = selectedClass.proficiencies.skills.fixed.length > 0;
                                    const hasArmor = selectedClass.proficiencies.armor.length > 0;
                                    const hasWeapons = selectedClass.proficiencies.weapons.length > 0;
                                    const hasTools = selectedClass.proficiencies.tools.length > 0;

                                    return (
                                        <div className="rounded-2xl border border-white/15 bg-black/30 p-5 space-y-4">
                                            <div>
                                                <p className="text-[0.6rem] uppercase tracking-[0.35em] text-white/60">Class Spotlight</p>
                                                <p className="mt-2 text-lg font-semibold text-white">{selectedClass.label}</p>
                                                <p className="mt-2 text-sm text-white/70">{selectedClass.detail}</p>
                                            </div>

                                            <div className="space-y-3 pt-3 border-t border-white/10">
                                                <div>
                                                    <p className="text-[0.6rem] uppercase tracking-[0.35em] text-white/60">Hit Die</p>
                                                    <p className="mt-1 text-xs text-white/70">1d{selectedClass.hitDie} per level</p>
                                                </div>

                                                <div>
                                                    <p className="text-[0.6rem] uppercase tracking-[0.35em] text-white/60">Saving Throws</p>
                                                    <p className="mt-1 text-xs text-white/70">{selectedClass.savingThrows.join(", ")}</p>
                                                </div>

                                                {hasArmor && (
                                                    <div>
                                                        <p className="text-[0.6rem] uppercase tracking-[0.35em] text-white/60">Armor</p>
                                                        <p className="mt-1 text-xs text-white/70">{selectedClass.proficiencies.armor.join(", ")}</p>
                                                    </div>
                                                )}

                                                {hasWeapons && (
                                                    <div>
                                                        <p className="text-[0.6rem] uppercase tracking-[0.35em] text-white/60">Weapons</p>
                                                        <p className="mt-1 text-xs text-white/70">{selectedClass.proficiencies.weapons.join(", ")}</p>
                                                    </div>
                                                )}

                                                {hasTools && (
                                                    <div>
                                                        <p className="text-[0.6rem] uppercase tracking-[0.35em] text-white/60">Tools</p>
                                                        <p className="mt-1 text-xs text-white/70">{selectedClass.proficiencies.tools.join(", ")}</p>
                                                    </div>
                                                )}

                                                {(hasSkillChoices || hasFixedSkills) && (
                                                    <div>
                                                        <p className="text-[0.6rem] uppercase tracking-[0.35em] text-white/60">Skills</p>
                                                        {hasFixedSkills && (
                                                            <p className="mt-1 text-xs text-white/70">{selectedClass.proficiencies.skills.fixed.join(", ")}</p>
                                                        )}
                                                        {hasSkillChoices && (
                                                            <p className="mt-1 text-xs text-white/70">
                                                                Choose {hasSkillChoices.count} from: {hasSkillChoices.options.join(", ")}
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            <p className="mt-3 text-xs text-white/50">Hover or select a class to update.</p>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    )}

                    {currentStep.id === "class" && availableSkillChoices && (
                        <div className="mt-6 rounded-2xl border border-white/15 bg-black/30 p-6">
                            <div className="mb-4">
                                <p className="text-[0.6rem] uppercase tracking-[0.35em] text-white/60">Skill Proficiencies</p>
                                <p className="mt-1 text-sm text-white/70">
                                    Choose {availableSkillChoices.count} skill{availableSkillChoices.count !== 1 ? 's' : ''} from the options below
                                </p>
                                <p className="mt-1 text-xs text-white/50">
                                    {formState.selectedSkills.length} / {availableSkillChoices.count} selected
                                </p>
                            </div>
                            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                {availableSkillChoices.options.map((skill) => {
                                    const isSelected = formState.selectedSkills.includes(skill);
                                    const canSelect = isSelected || formState.selectedSkills.length < availableSkillChoices.count;
                                    return (
                                        <button
                                            type="button"
                                            key={skill}
                                            onClick={() => {
                                                if (isSelected) {
                                                    setFormState((prev) => ({
                                                        ...prev,
                                                        selectedSkills: prev.selectedSkills.filter((s) => s !== skill),
                                                    }));
                                                } else if (canSelect) {
                                                    setFormState((prev) => ({
                                                        ...prev,
                                                        selectedSkills: [...prev.selectedSkills, skill],
                                                    }));
                                                }
                                            }}
                                            disabled={!canSelect && !isSelected}
                                            className={`rounded-xl border px-3 py-2 text-left text-sm transition ${isSelected
                                                ? "border-rose-300 bg-rose-300/10 text-white"
                                                : canSelect
                                                    ? "border-white/15 bg-black/30 text-white/70 hover:border-white/30"
                                                    : "border-white/5 bg-black/20 text-white/30 cursor-not-allowed"
                                                }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className={`h-4 w-4 rounded border flex items-center justify-center ${isSelected ? "border-rose-300 bg-rose-300" : "border-white/30"
                                                    }`}>
                                                    {isSelected && (
                                                        <svg className="h-3 w-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    )}
                                                </div>
                                                <span className="font-medium">{skill}</span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {currentStep.id === "subclass" && (() => {
                        const selectedClass = classOptions.find((c) => c.value === formState.charClass);
                        const subclasses = selectedClass?.subclasses || [];

                        // If no subclasses available, skip this step
                        if (subclasses.length === 0) {
                            return (
                                <div className="mt-6 rounded-2xl border border-white/15 bg-black/30 p-6 text-center">
                                    <p className="text-sm text-white/70">This class has no level 1 subclass choices.</p>
                                    <p className="mt-2 text-xs text-white/50">Click Next to continue.</p>
                                </div>
                            );
                        }

                        const flavorText = subclasses[0]?.flavorText || "Subclass";

                        return (
                            <div className="mt-6 flex flex-col gap-6 lg:flex-row">
                                <div className="grid gap-3 md:grid-cols-2 lg:w-2/3">
                                    {subclasses.map((option) => {
                                        const active = formState.subclass === option.name;
                                        return (
                                            <button
                                                type="button"
                                                key={option.index}
                                                onClick={() => setFormState((prev) => ({ ...prev, subclass: option.name }))}
                                                onMouseEnter={() => setHoveredBackground(option.name)}
                                                onMouseLeave={() => setHoveredBackground(null)}
                                                onFocus={() => setHoveredBackground(option.name)}
                                                onBlur={() => setHoveredBackground(null)}
                                                className={`rounded-2xl border px-4 py-4 text-left transition ${active ? "border-rose-300 bg-rose-300/10" : "border-white/15 bg-black/30 hover:border-white/30"
                                                    }`}
                                            >
                                                <p className="text-sm font-semibold text-white">{option.name}</p>
                                                <p className="mt-1 text-xs text-white/70">
                                                    {option.description.length > 150
                                                        ? `${option.description.substring(0, 150)}...`
                                                        : option.description}
                                                </p>
                                            </button>
                                        );
                                    })}
                                </div>
                                <div className="lg:w-1/3">
                                    {(() => {
                                        const hoveredSubclass = subclasses.find(
                                            (s) => s.name === (hoveredBackground ?? formState.subclass)
                                        ) ?? subclasses[0];

                                        return (
                                            <div className="rounded-2xl border border-white/15 bg-black/30 p-5 space-y-4">
                                                <div>
                                                    <p className="text-[0.6rem] uppercase tracking-[0.35em] text-white/60">{flavorText}</p>
                                                    <p className="mt-2 text-lg font-semibold text-white">{hoveredSubclass.name}</p>
                                                    <p className="mt-2 text-sm text-white/70 leading-relaxed">{hoveredSubclass.description}</p>
                                                </div>
                                                <p className="mt-3 text-xs text-white/50 pt-3 border-t border-white/10">
                                                    Hover or select a {flavorText.toLowerCase()} to update.
                                                </p>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        );
                    })()}

                    {currentStep.id === "equipment" && (() => {
                        const selectedClass = classOptions.find((c) => c.value === formState.charClass);
                        if (!selectedClass) {
                            return null;
                        }

                        const startingEquipment = selectedClass.startingEquipment || [];
                        const equipmentOptions = selectedClass.startingEquipmentOptions || [];

                        // Helper to render equipment option
                        const renderEquipmentOption = (option: any, optionIndex: number, choiceIndex: number) => {
                            if (option.option_type === "counted_reference") {
                                const count = option.count || 1;
                                const name = option.of?.name || "Unknown";
                                return (
                                    <span key={`${optionIndex}-${choiceIndex}`}>
                                        {count > 1 ? `${count}× ` : ""}{name}
                                    </span>
                                );
                            }
                            if (option.option_type === "choice") {
                                const desc = option.choice?.desc || "Choose from category";
                                return <span key={`${optionIndex}-${choiceIndex}`}>{desc}</span>;
                            }
                            return <span key={`${optionIndex}-${choiceIndex}`}>Unknown option</span>;
                        };

                        return (
                            <div className="mt-6 space-y-6">
                                {/* Starting Equipment (automatic) */}
                                {startingEquipment.length > 0 && (
                                    <div className="rounded-2xl border border-white/15 bg-black/30 p-6">
                                        <p className="text-[0.6rem] uppercase tracking-[0.35em] text-white/60 mb-4">
                                            Automatic Starting Equipment
                                        </p>
                                        <div className="grid gap-2 sm:grid-cols-2">
                                            {startingEquipment.map((item, index) => (
                                                <div key={index} className="flex items-center gap-2 text-sm text-white/70">
                                                    <div className="h-2 w-2 rounded-full bg-rose-300/50" />
                                                    <span>
                                                        {item.quantity > 1 ? `${item.quantity}× ` : ""}
                                                        {item.equipment.name}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Equipment Choices */}
                                {equipmentOptions.length > 0 && (
                                    <div className="space-y-4">
                                        <div className="rounded-2xl border border-white/15 bg-black/30 p-6">
                                            <p className="text-[0.6rem] uppercase tracking-[0.35em] text-white/60 mb-2">
                                                Equipment Choices
                                            </p>
                                            <p className="text-sm text-white/70 mb-4">
                                                Select one option from each choice below
                                            </p>
                                            <p className="text-xs text-white/50">
                                                {Object.keys(formState.equipmentChoices).length} / {equipmentOptions.length} selected
                                            </p>
                                        </div>

                                        {equipmentOptions.map((equipOption, optionIndex) => {
                                            let options = equipOption.from?.options || [];
                                            
                                            // If it's an equipment_category type, expand it to actual equipment
                                            if (equipOption.from?.option_set_type === "equipment_category" && equipOption.from?.equipment_category) {
                                                options = expandEquipmentCategory(equipOption.from.equipment_category.index);
                                            }
                                            
                                            const selectedChoice = formState.equipmentChoices[optionIndex];

                                            return (
                                                <div key={optionIndex} className="rounded-2xl border border-white/15 bg-black/30 p-6">
                                                    <p className="text-sm font-semibold text-white mb-3">
                                                        Choice {optionIndex + 1}: {equipOption.desc}
                                                    </p>
                                                    <div className="grid gap-3 sm:grid-cols-2">
                                                        {options.map((choice: any, choiceIndex: number) => {
                                                            const isSelected = selectedChoice === choiceIndex;
                                                            return (
                                                                <button
                                                                    type="button"
                                                                    key={choiceIndex}
                                                                    onClick={() => {
                                                                        setFormState((prev) => ({
                                                                            ...prev,
                                                                            equipmentChoices: {
                                                                                ...prev.equipmentChoices,
                                                                                [optionIndex]: choiceIndex,
                                                                            },
                                                                        }));
                                                                    }}
                                                                    className={`rounded-xl border px-4 py-3 text-left text-sm transition ${isSelected
                                                                        ? "border-rose-300 bg-rose-300/10 text-white"
                                                                        : "border-white/15 bg-black/30 text-white/70 hover:border-white/30"
                                                                        }`}
                                                                >
                                                                    <div className="flex items-start gap-2">
                                                                        <div className={`mt-0.5 h-4 w-4 rounded-full border flex-shrink-0 flex items-center justify-center ${isSelected ? "border-rose-300 bg-rose-300" : "border-white/30"
                                                                            }`}>
                                                                            {isSelected && (
                                                                                <div className="h-2 w-2 rounded-full bg-black" />
                                                                            )}
                                                                        </div>
                                                                        <div className="flex-1">
                                                                            {renderEquipmentOption(choice, optionIndex, choiceIndex)}
                                                                        </div>
                                                                    </div>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {startingEquipment.length === 0 && equipmentOptions.length === 0 && (
                                    <div className="rounded-2xl border border-white/15 bg-black/30 p-6 text-center">
                                        <p className="text-sm text-white/70">No starting equipment defined for this class.</p>
                                    </div>
                                )}
                            </div>
                        );
                    })()}

                    {currentStep.id === "alignment" && (
                        <div className="mt-6 grid gap-3 md:grid-cols-3">
                            {alignmentOptions.map((option) => {
                                const active = formState.alignment === option.value;
                                return (
                                    <button
                                        type="button"
                                        key={option.value}
                                        onClick={() => setFormState((prev) => ({ ...prev, alignment: option.value }))}
                                        className={`rounded-2xl border px-4 py-4 text-left transition ${active ? "border-rose-300 bg-rose-300/10" : "border-white/15 bg-black/30 hover:border-white/30"
                                            }`}
                                    >
                                        <p className="text-sm font-semibold text-white">{option.label}</p>
                                        <p className="mt-1 text-xs text-white/70">{option.description}</p>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    <div className="mt-6 flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex w-full flex-1 gap-3">
                            <button
                                type="button"
                                onClick={handleBack}
                                disabled={step === 0}
                                className="flex-1 rounded-2xl border border-white/20 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-white transition hover:border-white/40 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                Back
                            </button>
                            {step < activeSteps.length - 1 && (
                                <button
                                    type="button"
                                    onClick={handleNext}
                                    disabled={!canAdvance}
                                    className="flex-1 rounded-2xl bg-white/10 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    Next
                                </button>
                            )}
                        </div>
                        {step === activeSteps.length - 1 && <SubmitButton disabled={!canSubmit} />}
                    </div>
                </section>
            </div>
        </form>
    );
}
