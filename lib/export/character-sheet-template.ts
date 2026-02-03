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

interface SheetBaseImage {
    kind: "image";
    relativePath: string;
}

export interface SheetTemplateConfig {
    id: string;
    description: string;
    dimensions: {
        width: number;
        height: number;
    };
    asset: SheetBaseImage;
    fields: Record<string, SheetFieldPosition>;
    abilityScores: Record<AbilityCode, SheetFieldPosition>;
}

export const DEFAULT_CHARACTER_SHEET_TEMPLATE: SheetTemplateConfig = {
    id: "classic-jpg-sheet",
    description: "Classic 5E-style character sheet rendered from the shared JPEG template.",
    dimensions: {
        width: 768,
        height: 994,
    },
    asset: {
        kind: "image",
        relativePath: "templates/dnd-5e-sheet.jpg",
    },
    fields: {
        name: { x: 384, yFromTop: 80, fontSize: 26, align: "center" },
        class: { x: 140, yFromTop: 38, fontSize: 12 },
        level: { x: 260, yFromTop: 38, fontSize: 12 },
        background: { x: 520, yFromTop: 38, fontSize: 12 },
        alignment: { x: 664, yFromTop: 38, fontSize: 12, align: "right" },
        proficiencyBonus: { x: 520, yFromTop: 160, fontSize: 16 },
        walkingSpeed: { x: 612, yFromTop: 160, fontSize: 16 },
        initiative: { x: 700, yFromTop: 160, fontSize: 16 },
    },
    abilityScores: {
        str: { x: 72, yFromTop: 190, fontSize: 24 },
        dex: { x: 160, yFromTop: 190, fontSize: 24 },
        con: { x: 248, yFromTop: 190, fontSize: 24 },
        int: { x: 336, yFromTop: 190, fontSize: 24 },
        wis: { x: 424, yFromTop: 190, fontSize: 24 },
        cha: { x: 512, yFromTop: 190, fontSize: 24 },
    },
};
