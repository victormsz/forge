import { readFile } from "node:fs/promises";
import path from "node:path";

import type { PDFFont, PDFPage } from "pdf-lib";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

import type { CharacterProficiencies } from "@/lib/characters/types";
import type { SkillSummary } from "@/lib/characters/statistics";
import {
    DEFAULT_CHARACTER_SHEET_TEMPLATE,
    type AbilityCode,
    type SheetFieldPosition,
    type SheetTextBlockPosition,
    type SkillColumnLayout,
    type SpellListPageLayout,
    type SpellListColumnLayout,
} from "@/lib/export/character-sheet-template";

export interface CharacterSheetPayload {
    name: string;
    level: number;
    charClass?: string | null;
    ancestry?: string | null;
    background?: string | null;
    alignment?: string | null;
    walkingSpeed?: number | null;
    proficiencyBonus: number;
    armorClass: number;
    armorBreakdown: string;
    initiativeModifier: number;
    hitDice: string;
    maxHp: number;
    abilityScores: Record<AbilityCode, number>;
    abilityModifiers: Record<AbilityCode, number>;
    skillSummaries: SkillSummary[];
    proficiencies: CharacterProficiencies;
    spells: SpellListEntry[];
}

export interface SpellListEntry {
    name: string;
    level: number;
    isPrepared: boolean;
    school?: string | null;
    range?: string | null;
}

interface DrawContext {
    pageHeight: number;
    font: PDFFont;
    page: PDFPage;
}

const TEXT_COLOR = rgb(15 / 255, 15 / 255, 18 / 255);

interface ScaleFactors {
    x: number;
    y: number;
    font: number;
}

interface ScaledSkillColumn {
    keys: string[];
    valueX: number;
    labelX: number;
    startY: number;
    lineHeight: number;
    fontSize: number;
}

interface ScaledSpellColumn {
    levelX: number;
    nameX: number;
    width: number;
}

function resolveTemplateAsset(relativePath: string) {
    return path.join(process.cwd(), "public", relativePath);
}

function getScaleFactors(template: SheetTemplateConfig, pageWidth: number, pageHeight: number): ScaleFactors {
    const layoutWidth = template.layoutDimensions?.width ?? template.dimensions.width;
    const layoutHeight = template.layoutDimensions?.height ?? template.dimensions.height;
    return {
        x: pageWidth / layoutWidth,
        y: pageHeight / layoutHeight,
        font: (pageWidth / layoutWidth + pageHeight / layoutHeight) / 2,
    };
}

function scalePosition(position: SheetFieldPosition, scale: ScaleFactors): SheetFieldPosition {
    return {
        ...position,
        x: position.x * scale.x,
        yFromTop: position.yFromTop * scale.y,
        fontSize: position.fontSize * scale.font,
    };
}

function scaleTextBlock(position: SheetTextBlockPosition, scale: ScaleFactors): SheetTextBlockPosition {
    return {
        ...position,
        x: position.x * scale.x,
        yFromTop: position.yFromTop * scale.y,
        fontSize: position.fontSize * scale.font,
        lineHeight: position.lineHeight * scale.y,
        width: position.width * scale.x,
    };
}

function scaleSkillColumn(column: SkillColumnLayout, scale: ScaleFactors): ScaledSkillColumn {
    return {
        keys: column.keys,
        valueX: column.valueX * scale.x,
        labelX: column.labelX * scale.x,
        startY: column.yFromTop * scale.y,
        lineHeight: column.lineHeight * scale.y,
        fontSize: column.fontSize * scale.font,
    };
}

function scaleSpellColumn(column: SpellListColumnLayout, scale: ScaleFactors): ScaledSpellColumn {
    return {
        levelX: column.levelX * scale.x,
        nameX: column.nameX * scale.x,
        width: column.width * scale.x,
    };
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

function wrapLines(text: string, maxWidth: number, fontSize: number, font: PDFFont, maxLines?: number) {
    const words = text.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
        return ["—"];
    }

    const lines: string[] = [];
    let current = words.shift() ?? "";

    for (const word of words) {
        const testLine = `${current} ${word}`;
        const lineWidth = font.widthOfTextAtSize(testLine, fontSize);
        if (lineWidth <= maxWidth) {
            current = testLine;
        } else {
            lines.push(current);
            current = word;
        }
    }

    if (current) {
        lines.push(current);
    }

    if (typeof maxLines === "number" && lines.length > maxLines && maxLines > 0) {
        const truncated = lines.slice(0, maxLines);
        const lastIndex = maxLines - 1;
        truncated[lastIndex] = `${truncated[lastIndex]}…`;
        return truncated;
    }

    return lines;
}

function drawTextBlock(value: string | string[] | undefined, position: SheetTextBlockPosition, ctx: DrawContext, scale: ScaleFactors) {
    const textValue = Array.isArray(value) ? value.join(", ") : value;
    const content = textValue && textValue.trim().length > 0 ? textValue : "—";
    const scaled = scaleTextBlock(position, scale);
    const lines = wrapLines(content, scaled.width, scaled.fontSize, ctx.font, position.maxLines);

    lines.forEach((line, index) => {
        const y = ctx.pageHeight - scaled.yFromTop - scaled.fontSize - index * scaled.lineHeight;
        ctx.page.drawText(line, {
            x: scaled.x,
            y,
            size: scaled.fontSize,
            font: ctx.font,
            color: TEXT_COLOR,
        });
    });
}

function drawSkillEntry(skill: SkillSummary, column: ScaledSkillColumn, index: number, ctx: DrawContext) {
    const modifier = formatModifier(skill.total);
    const descriptor = skill.proficient
        ? `${skill.label} (${skill.ability.toUpperCase()}) · Proficient`
        : `${skill.label} (${skill.ability.toUpperCase()})`;
    const y = ctx.pageHeight - column.startY - column.fontSize - index * column.lineHeight;
    const modifierWidth = ctx.font.widthOfTextAtSize(modifier, column.fontSize);

    ctx.page.drawText(modifier, {
        x: column.valueX - modifierWidth,
        y,
        size: column.fontSize,
        font: ctx.font,
        color: TEXT_COLOR,
    });

    ctx.page.drawText(descriptor, {
        x: column.labelX,
        y,
        size: column.fontSize,
        font: ctx.font,
        color: TEXT_COLOR,
    });
}

function drawSpellList(layout: SpellListPageLayout, spells: SpellListEntry[], ctx: DrawContext, scale: ScaleFactors) {
    const columns = layout.columns.map((column) => scaleSpellColumn(column, scale));
    const rowHeight = layout.rowHeight * scale.y;
    const startY = layout.startY * scale.y;
    const fontSize = layout.fontSize * scale.font;
    const rowsPerColumn = Math.max(1, layout.rowsPerColumn);
    const lineSpacing = fontSize * 0.85;
    const sortedSpells = spells.slice().sort((a, b) => {
        if (a.level !== b.level) {
            return a.level - b.level;
        }
        return a.name.localeCompare(b.name);
    });

    if (sortedSpells.length === 0) {
        const placeholderColumn = columns[0];
        const placeholderY = ctx.pageHeight - startY - fontSize;
        const message = "No spells recorded. Add spells to populate this page.";
        ctx.page.drawText(message, {
            x: placeholderColumn?.nameX ?? 48,
            y: placeholderY,
            size: fontSize,
            font: ctx.font,
            color: TEXT_COLOR,
        });
        return;
    }

    sortedSpells.forEach((spell, index) => {
        const columnIndex = Math.floor(index / rowsPerColumn);
        if (columnIndex >= columns.length) {
            return;
        }
        const rowIndex = index % rowsPerColumn;
        const column = columns[columnIndex];
        const baseY = ctx.pageHeight - startY - fontSize - rowIndex * rowHeight;
        const levelLabel = spell.level === 0 ? "Cantrip" : `Lvl ${spell.level}`;

        ctx.page.drawText(levelLabel, {
            x: column.levelX,
            y: baseY,
            size: fontSize,
            font: ctx.font,
            color: TEXT_COLOR,
        });

        const segments = [spell.name];
        if (spell.isPrepared) {
            segments.push("Prepared");
        }
        if (spell.school) {
            segments.push(spell.school);
        }
        if (spell.range) {
            segments.push(spell.range);
        }
        const detail = segments.join(" · ");
        const wrapped = wrapLines(detail, column.width, fontSize, ctx.font, 2);

        wrapped.forEach((line, lineIndex) => {
            ctx.page.drawText(line, {
                x: column.nameX,
                y: baseY - lineIndex * lineSpacing,
                size: fontSize,
                font: ctx.font,
                color: TEXT_COLOR,
            });
        });
    });
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
    const abilityModifiers = payload.abilityModifiers;
    const assetPath = resolveTemplateAsset(template.asset.relativePath);
    let assetBytes: Uint8Array;

    try {
        assetBytes = await readFile(assetPath);
    } catch {
        throw new Error(`Character sheet template missing at ${template.asset.relativePath}. Place the asset inside public/templates.`);
    }

    const pdf = await PDFDocument.create();
    let page: PDFPage;
    let templatePdf: PDFDocument | null = null;

    if (template.asset.kind === "pdf") {
        templatePdf = await PDFDocument.load(assetBytes);
        const [templatePage] = await pdf.copyPages(templatePdf, [template.asset.pageIndex ?? 0]);
        page = pdf.addPage(templatePage);
    } else {
        page = pdf.addPage([template.dimensions.width, template.dimensions.height]);
        const relative = template.asset.relativePath.toLowerCase();
        const image = relative.endsWith(".png") ? await pdf.embedPng(assetBytes) : await pdf.embedJpg(assetBytes);
        page.drawImage(image, {
            x: 0,
            y: 0,
            width: page.getWidth(),
            height: page.getHeight(),
        });
    }

    const font = await pdf.embedFont(StandardFonts.HelveticaBold);

    const ctx: DrawContext = {
        pageHeight: page.getHeight(),
        font,
        page,
    };

    const scale = getScaleFactors(template, page.getWidth(), page.getHeight());
    const ancestryLine = [payload.ancestry, payload.background, payload.alignment]
        .filter((entry): entry is string => Boolean(entry))
        .join(" · ");
    const maxHpNote = `Avg + CON (${formatModifier(abilityModifiers.con)} / lvl)`;

    const fieldValues: Record<string, string | undefined> = {
        name: payload.name,
        class: payload.charClass ?? undefined,
        level: payload.level.toString(),
        background: payload.background ?? undefined,
        alignment: payload.alignment ?? undefined,
        ancestryLine: ancestryLine || undefined,
        proficiencyBonus: formatModifier(payload.proficiencyBonus),
        walkingSpeed: payload.walkingSpeed ? `${payload.walkingSpeed} ft` : undefined,
        initiative: formatModifier(payload.initiativeModifier),
        armorClass: payload.armorClass.toString(),
        armorBreakdown: payload.armorBreakdown,
        maxHp: payload.maxHp.toString(),
        maxHpNote,
        hitDice: payload.hitDice,
    };

    for (const [field, value] of Object.entries(fieldValues)) {
        const position = template.fields[field];
        if (!position) continue;
        drawText(value, scalePosition(position, scale), ctx);
    }

    (Object.keys(template.abilityScores) as AbilityCode[]).forEach((ability) => {
        const position = template.abilityScores[ability];
        const scaled = scalePosition(position, scale);
        const score = abilityScores[ability] ?? 0;
        drawText(score > 0 ? String(score) : undefined, scaled, ctx);
    });

    if (template.abilityModifiers) {
        (Object.keys(template.abilityModifiers) as AbilityCode[]).forEach((ability) => {
            const position = template.abilityModifiers?.[ability];
            if (!position) return;
            const scaled = scalePosition(position, scale);
            drawText(formatModifier(abilityModifiers[ability] ?? 0), scaled, ctx);
        });
    }

    const skillLookup = new Map(payload.skillSummaries.map((skill) => [skill.key, skill]));
    (template.skillColumns ?? [])
        .map((column) => scaleSkillColumn(column, scale))
        .forEach((column) => {
            column.keys.forEach((key, index) => {
                const skill = skillLookup.get(key);
                if (!skill) return;
                drawSkillEntry(skill, column, index, ctx);
            });
        });

    if (template.proficiencyBlocks) {
        (Object.entries(template.proficiencyBlocks) as [keyof CharacterProficiencies, SheetTextBlockPosition][]).forEach(([key, block]) => {
            drawTextBlock(payload.proficiencies[key], block, ctx, scale);
        });
    }

    if (template.spellPage) {
        if (!templatePdf && template.asset.kind === "pdf") {
            templatePdf = await PDFDocument.load(assetBytes);
        }
        if (!templatePdf) {
            throw new Error("Spell list rendering requires a PDF-based template asset.");
        }
        const [spellTemplatePage] = await pdf.copyPages(templatePdf, [template.spellPage.pageIndex]);
        const spellPage = pdf.addPage(spellTemplatePage);
        const spellCtx: DrawContext = {
            pageHeight: spellPage.getHeight(),
            font,
            page: spellPage,
        };
        const spellScale = getScaleFactors(template, spellPage.getWidth(), spellPage.getHeight());
        drawSpellList(template.spellPage, payload.spells, spellCtx, spellScale);
    }

    return pdf.save();
}
