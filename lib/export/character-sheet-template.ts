export type AbilityCode = "str" | "dex" | "con" | "int" | "wis" | "cha";

type TextAlignment = "left" | "center" | "right";

export interface SheetFieldPosition {
    /** horizontal origin measured from the left edge of the template */
    x: number;
    /** vertical origin measured from the top edge of the template */
    yFromTop: number;
    fontSize: number;
    align?: TextAlignment;
}

type SheetAsset =
    | {
        kind: "image";
        relativePath: string;
    }
    | {
        kind: "pdf";
        relativePath: string;
        pageIndex?: number;
    };

export interface SheetTextBlockPosition extends SheetFieldPosition {
    lineHeight: number;
    width: number;
    maxLines?: number;
}

export interface SkillColumnLayout {
    keys: string[];
    valueX: number;
    yFromTop: number;
    lineHeight: number;
    fontSize: number;
}

type ProficiencyCategory = "armor" | "weapons" | "tools" | "languages";

export interface SpellListColumnLayout {
    levelX: number;
    nameX: number;
    width: number;
}

export interface SpellListPageLayout {
    pageIndex: number;
    startY: number;
    rowHeight: number;
    fontSize: number;
    rowsPerColumn: number;
    columns: SpellListColumnLayout[];
}

export interface SheetTemplateConfig {
    id: string;
    description: string;
    dimensions: {
        width: number;
        height: number;
    };
    layoutDimensions?: {
        width: number;
        height: number;
    };
    asset: SheetAsset;
    fields: Record<string, SheetFieldPosition>;
    abilityScores: Record<AbilityCode, SheetFieldPosition>;
    abilityModifiers?: Record<AbilityCode, SheetFieldPosition>;
    skillColumns?: SkillColumnLayout[];
    proficiencyBlocks?: Record<ProficiencyCategory, SheetTextBlockPosition>;
    spellPage?: SpellListPageLayout;
}

// Position variables for easy PDF layout tweaks.
// Header + top stats fields.
const FIELD_POSITIONS = {
    name: { x: 100, yFromTop: 22, fontSize: 12, align: "center" as const },
    background: { x: 100, yFromTop: 50, fontSize: 12 },
    class: { x: 250, yFromTop: 50, fontSize: 12 },
    ancestryLine: { x: 384, yFromTop: 110, fontSize: 14, align: "center" as const },

    level: { x: 350, yFromTop: 40, fontSize: 12 },
    armorClass: { x: 420, yFromTop: 50, fontSize: 24 },

    proficiencyBonus: { x: 65, yFromTop: 190, fontSize: 16 },

    walkingSpeed: { x: 430, yFromTop: 170, fontSize: 16 },
    initiative: { x: 320, yFromTop: 170, fontSize: 16 },
    size: { x: 570, yFromTop: 170, fontSize: 16 },
    perception: { x: 700, yFromTop: 170, fontSize: 16 },

    maxHp: { x: 570, yFromTop: 75, fontSize: 12 },
    hitDice: { x: 630, yFromTop: 75, fontSize: 12 },
    maxHpNote: { x: 220, yFromTop: 280, fontSize: 10 },

    armorBreakdown: { x: 380, yFromTop: 280, fontSize: 10 },
    alignment: { x: 664, yFromTop: 38, fontSize: 12, align: "right" as const },
} as const;

// Ability score box values.
const ABILITY_SCORE_POSITIONS = {
    int: { x: 180, yFromTop: 170, fontSize: 24 },
    wis: { x: 180, yFromTop: 390, fontSize: 24 },
    cha: { x: 180, yFromTop: 620, fontSize: 24 },
    str: { x: 40, yFromTop: 270, fontSize: 24 },
    dex: { x: 40, yFromTop: 420, fontSize: 24 },
    con: { x: 40, yFromTop: 610, fontSize: 24 },
} as const;

// Ability modifier box values.
const ABILITY_MODIFIER_POSITIONS = {
    int: { x: 225, yFromTop: 180, fontSize: 12 },
    wis: { x: 225, yFromTop: 410, fontSize: 12 },
    cha: { x: 225, yFromTop: 630, fontSize: 12 },
    str: { x: 90, yFromTop: 280, fontSize: 12 },
    dex: { x: 90, yFromTop: 430, fontSize: 12 },
    con: { x: 90, yFromTop: 620, fontSize: 12 },
} as const;

// Skill list columns (left/right).
const SKILL_COLUMNS: SkillColumnLayout[] = [
    {
        keys: [ //str
            "athletics",
        ],
        valueX: 45,
        yFromTop: 360,
        lineHeight: 18,
        fontSize: 8,
    },
    {
        keys: [ //int
            "arcana",
            "history",
            "investigation",
            "nature",
            "religion",
        ],
        valueX: 185,
        yFromTop: 260,
        lineHeight: 18,
        fontSize: 8,
    },
    {
        keys: [ //dex
            "acrobatics",
            "sleight of hand",
            "stealth",
        ],
        valueX: 45,
        yFromTop: 510,
        lineHeight: 18,
        fontSize: 8,
    },
    {
        keys: [ //wis
            "animal handling",
            "insight",
            "medicine",
            "perception",
            "survival",
        ],
        valueX: 185,
        yFromTop: 485,
        lineHeight: 18,
        fontSize: 8,
    },
    {
        keys: [ //cha
            "deception",
            "intimidation",
            "performance",
            "persuasion",
        ],
        valueX: 185,
        yFromTop: 710,
        lineHeight: 18,
        fontSize: 8,
    },
    {
        keys: [ //con
        ],
        valueX: 45,
        yFromTop: 340,
        lineHeight: 18,
        fontSize: 8,
    },
];

// Proficiency text blocks.
const PROFICIENCY_BLOCKS = {
    armor: { x: 72, yFromTop: 620, fontSize: 12, lineHeight: 16, width: 300 },
    weapons: { x: 72, yFromTop: 680, fontSize: 12, lineHeight: 16, width: 300 },
    tools: { x: 420, yFromTop: 620, fontSize: 12, lineHeight: 16, width: 300 },
    languages: { x: 420, yFromTop: 680, fontSize: 12, lineHeight: 16, width: 300 },
} as const;

// Spell list page layout.
const SPELL_PAGE_LAYOUT: SpellListPageLayout = {
    pageIndex: 1,
    startY: 235,
    rowHeight: 22,
    fontSize: 10,
    rowsPerColumn: 18,
    columns: [
        { levelX: 35, nameX: 110, width: 100 },
        { levelX: 55, nameX: 338, width: 190 },
        { levelX: 200, nameX: 566, width: 190 },
    ],
};

export const DEFAULT_CHARACTER_SHEET_TEMPLATE: SheetTemplateConfig = {
    id: "classic-pdf-sheet",
    description: "Vector 5.5E sheet layout rendered from the supplied PDF template.",
    dimensions: {
        width: 603,
        height: 774,
    },
    layoutDimensions: {
        width: 768,
        height: 994,
    },
    asset: {
        kind: "pdf",
        relativePath: "templates/dnd-5.5e-sheet.pdf",
    },
    fields: FIELD_POSITIONS,
    abilityScores: ABILITY_SCORE_POSITIONS,
    abilityModifiers: ABILITY_MODIFIER_POSITIONS,
    skillColumns: SKILL_COLUMNS,
    proficiencyBlocks: PROFICIENCY_BLOCKS,
    spellPage: SPELL_PAGE_LAYOUT,
};
