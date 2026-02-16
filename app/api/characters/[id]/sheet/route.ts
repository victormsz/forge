import { NextResponse } from "next/server";

import { getCurrentActor } from "@/lib/current-actor";
import { generateCharacterSheetPdf } from "@/lib/export";
import { canViewCharacterSheet } from "@/lib/parties/access";
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
import { findReferenceItemById, type ItemReference } from "@/lib/items/reference";
import { SPELL_AFFINITY_LABELS } from "@/lib/spells/labels";

function slugify(value: string) {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60) || "character";
}

type EquippedSlot = "MAIN_HAND" | "OFF_HAND" | "ARMOR" | "SHIELD";

function computeArmorBase(reference: ItemReference | null, dexModifier: number) {
    if (!reference?.armorClass) {
        return 10 + dexModifier;
    }
    const { base, dexBonus, maxBonus } = reference.armorClass;
    if (!dexBonus) {
        return base;
    }
    const dexApplied = typeof maxBonus === "number" ? Math.min(dexModifier, maxBonus) : dexModifier;
    return base + dexApplied;
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const actor = await getCurrentActor();

    if (!actor) {
        return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    const character = await prisma.character.findFirst({
        where: {
            id,
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
                    affinity: true,
                    damage: true,
                },
            },
            items: {
                select: {
                    referenceId: true,
                    equippedSlot: true,
                },
            },
        },
    });

    if (!character) {
        return NextResponse.json({ error: "Character not found" }, { status: 404 });
    }

    const canView = await canViewCharacterSheet(actor, character.userId);

    if (!canView) {
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
    const equippedArmor = character.items.find((item) => item.equippedSlot === "ARMOR") ?? null;
    const equippedShield = character.items.find((item) => item.equippedSlot === "SHIELD") ?? null;
    const armorReference = equippedArmor?.referenceId ? findReferenceItemById(equippedArmor.referenceId) : null;
    const shieldReference = equippedShield?.referenceId ? findReferenceItemById(equippedShield.referenceId) : null;
    const armorBase = computeArmorBase(armorReference, abilityModifiers.dex);
    const shieldGearBonus = shieldReference?.armorClass?.base ?? 0;
    const armorClass = armorBase + shieldGearBonus + armorBonus + shieldBonus + miscBonus;
    const armorBreakdown = [
        armorReference?.armorClass
            ? `${armorReference.name} base ${armorReference.armorClass.base}`
            : "10 base",
        armorReference?.armorClass
            ? armorReference.armorClass.dexBonus
                ? (() => {
                    const maxBonus = armorReference.armorClass?.maxBonus;
                    const dexApplied = typeof maxBonus === "number" ? Math.min(abilityModifiers.dex, maxBonus) : abilityModifiers.dex;
                    return `${formatModifier(dexApplied)} DEX${typeof maxBonus === "number" ? ` (max +${maxBonus})` : ""}`;
                })()
                : "DEX not applied"
            : `${formatModifier(abilityModifiers.dex)} DEX`,
        shieldGearBonus ? `+${shieldGearBonus} shield` : null,
        armorBonus ? `+${armorBonus} armor` : null,
        shieldBonus ? `+${shieldBonus} shield` : null,
        miscBonus ? `+${miscBonus} misc` : null,
    ]
        .filter(Boolean)
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
                affinityLabel: SPELL_AFFINITY_LABELS[spell.affinity],
                damage: spell.damage,
            })),
        });

        return new NextResponse(Buffer.from(pdfBytes), {
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
