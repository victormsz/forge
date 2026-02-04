import { NextResponse } from "next/server";

import { getCurrentActor } from "@/lib/current-actor";
import { generateCharacterSheetPdf } from "@/lib/export";
import { prisma } from "@/lib/prisma";
import { ABILITY_KEYS, type AbilityKey } from "@/lib/point-buy";
import {
    abilityModifier,
    buildSkillSummaries,
    computeProficiencyBonus,
    formatModifier,
    normalizeAbilityScores,
    normalizeProficiencies,
} from "@/lib/characters/statistics";
import { calculateMaxHp, getHitDieValue } from "@/lib/characters/hit-dice";
import type { CharacterProficiencies } from "@/lib/characters/types";

function slugify(value: string) {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60) || "character";
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
    const actor = await getCurrentActor();

    if (!actor) {
        return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    const character = await prisma.character.findFirst({
        where: {
            id: params.id,
            userId: actor.userId,
        },
        include: {
            spells: {
                orderBy: [
                    { level: "asc" },
                    { name: "asc" },
                ],
                select: {
                    id: true,
                    name: true,
                    level: true,
                    isPrepared: true,
                    school: true,
                    range: true,
                },
            },
        },
    });

    if (!character) {
        return NextResponse.json({ error: "Character not found" }, { status: 404 });
    }

    const abilityScores = normalizeAbilityScores(character.abilityScores);
    const abilityModifiers = ABILITY_KEYS.reduce((acc, key) => {
        acc[key] = abilityModifier(abilityScores[key]);
        return acc;
    }, {} as Record<AbilityKey, number>);
    const proficiencyBonus = computeProficiencyBonus(character.level);
    const armorBonus = character.armorBonus ?? 0;
    const shieldBonus = character.shieldBonus ?? 0;
    const miscBonus = character.miscBonus ?? 0;
    const armorClass = 10 + abilityModifiers.dex + armorBonus + shieldBonus + miscBonus;
    const armorBreakdown = [
        "10 base",
        `${formatModifier(abilityModifiers.dex)} DEX`,
    ]
        .concat(armorBonus ? [`+${armorBonus} armor`] : [])
        .concat(shieldBonus ? [`+${shieldBonus} shield`] : [])
        .concat(miscBonus ? [`+${miscBonus} misc`] : [])
        .join(" · ");
    const walkingSpeed = 30;
    const initiativeModifier = abilityModifiers.dex;
    const hitDieValue = getHitDieValue(character.charClass);
    const hitDiceDisplay = `${character.level}d${hitDieValue}`;
    const maxHp = calculateMaxHp(character.level, hitDieValue, abilityModifiers.con);
    const proficiencies: CharacterProficiencies = normalizeProficiencies(character.proficiencies);
    const skillSummaries = buildSkillSummaries(proficiencies, abilityModifiers, proficiencyBonus);

    try {
        const pdfBytes = await generateCharacterSheetPdf({
            name: character.name,
            ancestry: character.ancestry,
            level: character.level,
            charClass: character.charClass,
            background: character.background,
            alignment: character.alignment,
            walkingSpeed,
            proficiencyBonus,
            armorClass,
            armorBreakdown,
            initiativeModifier,
            hitDice: hitDiceDisplay,
            maxHp,
            abilityScores,
            abilityModifiers,
            skillSummaries,
            proficiencies,
            spells: character.spells.map((spell) => ({
                name: spell.name,
                level: spell.level,
                isPrepared: spell.isPrepared,
                school: spell.school,
                range: spell.range,
            })),
        });

        return new NextResponse(pdfBytes, {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="${slugify(character.name)}.pdf"`,
                "Cache-Control": "no-store",
            },
        });
    } catch (error) {
        console.error("Failed to generate sheet", error);
        return NextResponse.json({ error: "Failed to build PDF" }, { status: 500 });
    }
}
