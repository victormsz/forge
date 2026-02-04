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
    labelX: number;
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
    fields: {
        name: { x: 384, yFromTop: 80, fontSize: 26, align: "center" },
        class: { x: 140, yFromTop: 38, fontSize: 12 },
        level: { x: 260, yFromTop: 38, fontSize: 12 },
        background: { x: 520, yFromTop: 38, fontSize: 12 },
        alignment: { x: 664, yFromTop: 38, fontSize: 12, align: "right" },
        ancestryLine: { x: 384, yFromTop: 110, fontSize: 14, align: "center" },
        proficiencyBonus: { x: 520, yFromTop: 160, fontSize: 16 },
        walkingSpeed: { x: 612, yFromTop: 160, fontSize: 16 },
        initiative: { x: 700, yFromTop: 160, fontSize: 16 },
        armorClass: { x: 80, yFromTop: 250, fontSize: 24 },
        armorBreakdown: { x: 80, yFromTop: 280, fontSize: 10 },
        maxHp: { x: 220, yFromTop: 250, fontSize: 24 },
        hitDice: { x: 360, yFromTop: 250, fontSize: 24 },
        maxHpNote: { x: 220, yFromTop: 280, fontSize: 10 },
    },
    abilityScores: {
        str: { x: 72, yFromTop: 190, fontSize: 24 },
        dex: { x: 160, yFromTop: 190, fontSize: 24 },
        con: { x: 248, yFromTop: 190, fontSize: 24 },
        int: { x: 336, yFromTop: 190, fontSize: 24 },
        wis: { x: 424, yFromTop: 190, fontSize: 24 },
        cha: { x: 512, yFromTop: 190, fontSize: 24 },
    },
    abilityModifiers: {
        str: { x: 72, yFromTop: 220, fontSize: 14 },
        dex: { x: 160, yFromTop: 220, fontSize: 14 },
        con: { x: 248, yFromTop: 220, fontSize: 14 },
        int: { x: 336, yFromTop: 220, fontSize: 14 },
        wis: { x: 424, yFromTop: 220, fontSize: 14 },
        cha: { x: 512, yFromTop: 220, fontSize: 14 },
    },
    skillColumns: [
        {
            keys: [
                "acrobatics",
                "animal handling",
                "arcana",
                "athletics",
                "deception",
                "history",
                "insight",
                "intimidation",
                "investigation",
            ],
            valueX: 72,
            labelX: 110,
            yFromTop: 340,
            lineHeight: 26,
            fontSize: 14,
        },
        {
            keys: [
                "medicine",
                "nature",
                "perception",
                "performance",
                "persuasion",
                "religion",
                "sleight of hand",
                "stealth",
                "survival",
            ],
            valueX: 384,
            labelX: 422,
            yFromTop: 340,
            lineHeight: 26,
            fontSize: 14,
        },
    ],
    proficiencyBlocks: {
        armor: { x: 72, yFromTop: 620, fontSize: 12, lineHeight: 16, width: 300 },
        weapons: { x: 72, yFromTop: 680, fontSize: 12, lineHeight: 16, width: 300 },
        tools: { x: 420, yFromTop: 620, fontSize: 12, lineHeight: 16, width: 300 },
        languages: { x: 420, yFromTop: 680, fontSize: 12, lineHeight: 16, width: 300 },
    },
    spellPage: {
        pageIndex: 1,
        startY: 140,
        rowHeight: 28,
        fontSize: 12,
        rowsPerColumn: 18,
        columns: [
            { levelX: 72, nameX: 110, width: 190 },
            { levelX: 300, nameX: 338, width: 190 },
            { levelX: 528, nameX: 566, width: 190 },
        ],
    },
};
