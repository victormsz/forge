import { readFile } from "node:fs/promises";
import path from "node:path";

import type { PDFFont, PDFPage } from "pdf-lib";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

import { DEFAULT_CHARACTER_SHEET_TEMPLATE, type AbilityCode, type SheetFieldPosition } from "@/lib/export/character-sheet-template";

export interface CharacterSheetPayload {
    name: string;
    level: number;
    charClass?: string | null;
    background?: string | null;
    alignment?: string | null;
    walkingSpeed?: number | null;
    abilityScores: Record<string, number>;
}

interface DrawContext {
    pageHeight: number;
    font: PDFFont;
    page: PDFPage;
}

const TEXT_COLOR = rgb(15 / 255, 15 / 255, 18 / 255);

function resolveTemplateAsset(relativePath: string) {
    return path.join(process.cwd(), "public", relativePath);
}

function getAbilityModifier(score: number) {
    return Math.floor((score - 10) / 2);
}

function formatModifier(value: number) {
    return value >= 0 ? `+${value}` : `${value}`;
}

function normalizeAbilityScores(rawScores: Record<string, number>): Record<AbilityCode, number> {
    const normalized: Record<AbilityCode, number> = {
        str: 0,
        dex: 0,
        con: 0,
        int: 0,
        wis: 0,
        cha: 0,
    };

    for (const [key, value] of Object.entries(rawScores)) {
        const lowerKey = key.toLowerCase() as AbilityCode;
        if (lowerKey in normalized) {
            normalized[lowerKey] = Number(value) || 0;
        }
    }

    return normalized;
}

function drawText(value: string | undefined, position: SheetFieldPosition, ctx: DrawContext) {
    if (!value) {
        return;
    }

    const text = value.toString();
    const textWidth = ctx.font.widthOfTextAtSize(text, position.fontSize);
    let x = position.x;

    if (position.align === "center") {
        x -= textWidth / 2;
    } else if (position.align === "right") {
        x -= textWidth;
    }

    const y = ctx.pageHeight - position.yFromTop - position.fontSize;

    ctx.page.drawText(text, {
        x,
        y,
        size: position.fontSize,
        font: ctx.font,
        color: TEXT_COLOR,
    });
}

export async function generateCharacterSheetPdf(payload: CharacterSheetPayload) {
    const template = DEFAULT_CHARACTER_SHEET_TEMPLATE;
    const abilityScores = normalizeAbilityScores(payload.abilityScores);
    const assetPath = resolveTemplateAsset(template.asset.relativePath);
    let backgroundBytes: Uint8Array;

    try {
        backgroundBytes = await readFile(assetPath);
    } catch {
        throw new Error(`Character sheet template missing at ${template.asset.relativePath}. Place the JPEG inside public/templates.`);
    }

    const pdf = await PDFDocument.create();
    const page = pdf.addPage([template.dimensions.width, template.dimensions.height]);
    const font = await pdf.embedFont(StandardFonts.HelveticaBold);

    const image = await pdf.embedJpg(backgroundBytes);
    page.drawImage(image, {
        x: 0,
        y: 0,
        width: template.dimensions.width,
        height: template.dimensions.height,
    });

    const ctx: DrawContext = {
        pageHeight: template.dimensions.height,
        font,
        page,
    };

    const fieldValues: Record<string, string | undefined> = {
        name: payload.name,
        class: payload.charClass ?? undefined,
        level: payload.level.toString(),
        background: payload.background ?? undefined,
        alignment: payload.alignment ?? undefined,
        proficiencyBonus: formatModifier(Math.floor((payload.level - 1) / 4) + 2),
        walkingSpeed: payload.walkingSpeed ? `${payload.walkingSpeed} ft` : undefined,
        initiative: formatModifier(getAbilityModifier(abilityScores.dex || 10)),
    };

    for (const [field, value] of Object.entries(fieldValues)) {
        const position = template.fields[field];
        if (!position) continue;
        drawText(value, position, ctx);
    }

    (Object.keys(template.abilityScores) as AbilityCode[]).forEach((ability) => {
        const position = template.abilityScores[ability];
        const score = abilityScores[ability] ?? 0;
        drawText(score > 0 ? String(score) : undefined, position, ctx);
    });

    return pdf.save();
}
