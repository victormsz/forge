import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";

import { SheetHeader } from "@/components/characters/sheet/sheet-header";
import { AbilityScoresCard } from "@/components/characters/sheet/ability-scores-card";
import { CombatStatsCard } from "@/components/characters/sheet/combat-stats-card";
import { SkillsCard } from "@/components/characters/sheet/skills-card";
import { CoreActionsCard } from "@/components/characters/sheet/core-actions-card";
import { CharacterInfoCard } from "@/components/characters/sheet/character-info-card";
import { EquipmentLoadoutCard } from "@/components/characters/sheet/equipment-loadout-card";
import { InventoryPreviewCard } from "@/components/characters/sheet/inventory-preview-card";
import { SpellbookCard } from "@/components/characters/sheet/spellbook-card";
import { ProficienciesCard } from "@/components/characters/sheet/proficiencies-card";
import { ClassFeaturesCard } from "@/components/characters/sheet/class-features-card";
import { FeatsCard } from "@/components/characters/sheet/feats-card";

import type { CharacterProficiencies, LevelUpChoicesMeta } from "@/lib/characters/types";
import { getCurrentActor } from "@/lib/current-actor";
import { prisma } from "@/lib/prisma";
import { ABILITY_KEYS, type AbilityKey } from "@/lib/point-buy";
import { calculateMaxHp, getHitDieValue } from "@/lib/characters/hit-dice";
import { getFeaturesUpToLevel, getSubclassFeaturesUpToLevel } from "@/lib/characters/leveling/level-data";
import { withFeatureDescriptions } from "@/lib/characters/leveling/feature-data";
import { findReferenceItemById } from "@/lib/items/reference";
import { normalizeCustomStats } from "@/lib/items/custom-stats";
import { canViewCharacterSheet } from "@/lib/parties/access";
import {
    abilityModifier,
    buildSkillSummaries,
    computeProficiencyBonus,
    normalizeAbilityScores,
    normalizeProficiencies,
} from "@/lib/characters/statistics";
import { EquipmentCalculator } from "@/lib/characters/equipment-calculator";
import type { EquippedItem } from "@/lib/characters/equipment-types";

export const metadata: Metadata = {
    title: "ForgeSheet | Character Sheet",
    description: "Immersive single-character sheet inspired by the printable D&D layout.",
};

type CharacterSheetPageProps = {
    params: Promise<{ id: string }>;
};

type EquippedSlot = "MAIN_HAND" | "OFF_HAND" | "ARMOR" | "SHIELD";

const GENERATION_LABELS: Record<string, string> = {
    POINT_BUY: "Point Buy",
    RANDOM: "Random Rolls",
};

function formatAbilityIncreases(choices: LevelUpChoicesMeta["abilityIncreases"]) {
    if (!Array.isArray(choices) || choices.length === 0) return null;
    return choices.map((c) => `${c.ability.toUpperCase()} +${c.amount}`).join(", ");
}

export default async function CharacterSheetPage({ params }: CharacterSheetPageProps) {
    const { id } = await params;
    const actor = await getCurrentActor();

    if (!actor) redirect("/");

    const character = await prisma.character.findFirst({
        where: { id },
        include: {
            user: { select: { id: true, name: true, email: true, role: true } },
            spells: { orderBy: [{ level: "asc" }, { name: "asc" }] },
            items: {
                orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
                take: 6,
                select: {
                    id: true, name: true, category: true, cost: true, weight: true,
                    quantity: true, description: true, notes: true, referenceId: true,
                    equippedSlot: true, isCustom: true, customStats: true, updatedAt: true,
                },
            },
            _count: { select: { items: true } },
        },
    });

    if (!character) notFound();

    const canView = await canViewCharacterSheet(actor, character.userId);
    if (!canView) notFound();

    // ── Core derived values ──────────────────────────────────────────────
    const isOwner = actor.userId === character.userId;
    const abilityScores = normalizeAbilityScores(character.abilityScores);
    const abilityModifiers = ABILITY_KEYS.reduce((acc, key) => {
        acc[key] = abilityModifier(abilityScores[key]);
        return acc;
    }, {} as Record<AbilityKey, number>);
    const proficiencyBonus = computeProficiencyBonus(character.level);
    const proficiencies: CharacterProficiencies = normalizeProficiencies(character.proficiencies);
    const skillSummaries = buildSkillSummaries(proficiencies, abilityModifiers, proficiencyBonus);

    const hitDieValue = getHitDieValue(character.charClass);
    const maxHpEstimate = calculateMaxHp(character.level, hitDieValue, abilityModifiers.con);

    // ── Spellcasting stats ────────────────────────────────────────────────
    const spellcastingAbility = (() => {
        const cls = character.charClass?.trim().toLowerCase() ?? "";
        if (!cls) return null;
        if (["bard", "sorcerer", "warlock", "paladin"].some((c) => cls.includes(c))) return "cha" as const;
        if (["cleric", "druid", "ranger"].some((c) => cls.includes(c))) return "wis" as const;
        if (["wizard", "artificer"].some((c) => cls.includes(c))) return "int" as const;
        return null;
    })();
    const spellcastingMod = spellcastingAbility ? abilityModifiers[spellcastingAbility] : null;
    const spellSaveDC = spellcastingMod !== null ? 8 + proficiencyBonus + spellcastingMod : undefined;
    const spellAttackBonus = spellcastingMod !== null ? proficiencyBonus + spellcastingMod : undefined;

    // ── Equipment ────────────────────────────────────────────────────────
    const rawItems = character.items ?? [];
    const equippedItems: EquippedItem[] = rawItems
        .filter((item) => item.equippedSlot !== null)
        .map((item) => ({
            id: item.id,
            name: item.name,
            slot: item.equippedSlot!,
            referenceId: item.referenceId,
            reference: item.referenceId ? findReferenceItemById(item.referenceId) : null,
            customStats: normalizeCustomStats(item.customStats),
        }));

    const equipmentBonuses = new EquipmentCalculator({
        equippedItems,
        abilityModifiers,
        proficiencyBonus,
        proficiencies,
        legacyArmorBonus: character.armorBonus ?? 0,
        legacyShieldBonus: character.shieldBonus ?? 0,
        legacyMiscBonus: character.miscBonus ?? 0,
    }).calculateBonuses();

    // ── Inventory preview ────────────────────────────────────────────────
    const inventoryPreview = rawItems.map((item) => {
        const ref = item.referenceId ? findReferenceItemById(item.referenceId) : null;
        const isWeapon = ref?.categories?.some((c) => /weapon/i.test(c)) ?? false;
        return {
            ...item,
            description: item.description ?? ref?.description ?? null,
            damageLabel: ref?.damageLabel ?? null,
            rangeLabel: ref?.rangeLabel ?? null,
            weaponProperties: isWeapon ? ref?.properties ?? [] : [],
            masteryTag: isWeapon ? (ref?.detailTags.find((t) => t.startsWith("Mastery:")) ?? null) : null,
            equippedSlot: (item.equippedSlot as EquippedSlot | null) ?? null,
        };
    });

    const equippedMainHand = inventoryPreview.find((i) => i.equippedSlot === "MAIN_HAND") ?? null;
    const equippedOffHand = inventoryPreview.find((i) => i.equippedSlot === "OFF_HAND") ?? null;
    const equippedArmor = inventoryPreview.find((i) => i.equippedSlot === "ARMOR") ?? null;
    const equippedShield = inventoryPreview.find((i) => i.equippedSlot === "SHIELD") ?? null;

    const armorRef = equippedArmor?.referenceId ? findReferenceItemById(equippedArmor.referenceId) : null;
    const shieldRef = equippedShield?.referenceId ? findReferenceItemById(equippedShield.referenceId) : null;

    // ── Level log ────────────────────────────────────────────────────────
    const levelLog = character.levelUpChoices as LevelUpChoicesMeta | null;
    const levelSummary = levelLog ? `Advanced to level ${levelLog.toLevel}` : `Level ${character.level}`;
    const levelDetail = levelLog
        ? [
            levelLog.subclass ? `Subclass: ${levelLog.subclass}` : null,
            levelLog.feat ? `Feat: ${levelLog.feat}` : null,
            formatAbilityIncreases(levelLog.abilityIncreases)
                ? `ASI: ${formatAbilityIncreases(levelLog.abilityIncreases)}`
                : null,
            levelLog.appliedAt ? `Applied ${new Date(levelLog.appliedAt).toLocaleDateString()}` : null,
        ].filter(Boolean).join(" · ") || "Level up recorded (details unavailable)."
        : "No level-up records yet.";

    // ── Features & feats ─────────────────────────────────────────────────
    const classFeatures = getFeaturesUpToLevel(character.charClass, character.level);
    const subclassFeatures = character.subclass
        ? getSubclassFeaturesUpToLevel(character.charClass, character.subclass, character.level)
        : [];
    const featureDetails = (() => {
        const seen = new Set<string>();
        return withFeatureDescriptions([...classFeatures, ...subclassFeatures]).filter((f) => {
            if (seen.has(f.index)) return false;
            seen.add(f.index);
            return true;
        });
    })();

    const feats: string[] = levelLog?.feat ? [levelLog.feat] : [];

    return (
        <div className="min-h-screen bg-forge text-white">
            <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-12 sm:px-6 lg:px-8">
                <SheetHeader character={character} isOwner={isOwner} />

                <section className="grid gap-6 lg:grid-cols-[1fr_320px]">
                    <div className="space-y-6">
                        <div className="rounded-3xl border border-white/15 bg-gradient-to-br from-white/10 to-white/5 shadow-2xl backdrop-blur-sm p-6">
                            <p className="text-xs font-bold uppercase tracking-wider text-white/70 mb-4">Overview</p>
                            <div className="flex flex-wrap items-center gap-2.5 text-[0.65rem]">
                                {[
                                    GENERATION_LABELS[character.generationMethod],
                                    character.user.role === "guest" ? "Guest owner" : "Synced account",
                                    `Sheet ID ${character.id.slice(0, 6)}`,
                                ].map((tag) => (
                                    <span key={tag} className="rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-white/70">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <AbilityScoresCard abilityScores={abilityScores} abilityModifiers={abilityModifiers} />

                        <CombatStatsCard
                            armorClass={equipmentBonuses.armorClass.total}
                            armorSegments={equipmentBonuses.armorClass.breakdown}
                            abilityModifiers={abilityModifiers}
                            proficiencyBonus={proficiencyBonus}
                            hitDiceDisplay={`${character.level}d${hitDieValue}`}
                            maxHpEstimate={maxHpEstimate}
                            level={character.level}
                            charClass={character.charClass}
                        />

                        <SkillsCard skillSummaries={skillSummaries} proficiencyBonus={proficiencyBonus} />

                        <CoreActionsCard
                            charClass={character.charClass}
                            mainHand={equipmentBonuses.mainHand}
                            offHand={equipmentBonuses.offHand}
                            mainHandAttackBonus={equipmentBonuses.mainHand?.attackBonus ?? 0}
                            mainHandDamage={equipmentBonuses.mainHand?.damage ?? null}
                            offHandAttackBonus={equipmentBonuses.offHand?.attackBonus ?? 0}
                            offHandDamage={equipmentBonuses.offHand?.damage ?? null}
                            spells={character.spells}
                            spellSaveDC={spellSaveDC}
                            spellAttackBonus={spellAttackBonus}
                        />
                    </div>

                    <aside className="space-y-6">
                        <CharacterInfoCard
                            ownerLabel={character.user.name ?? character.user.email ?? "Adventurer"}
                            generationLabel={GENERATION_LABELS[character.generationMethod]}
                            createdAt={character.createdAt}
                            updatedAt={character.updatedAt}
                            levelSummary={levelSummary}
                            levelDetail={levelDetail}
                        />
                        <EquipmentLoadoutCard
                            mainHand={equippedMainHand
                                ? { name: equippedMainHand.name, damage: equipmentBonuses.mainHand?.damage }
                                : null}
                            offHand={equippedOffHand
                                ? { name: equippedOffHand.name, damage: equipmentBonuses.offHand?.damage }
                                : null}
                            armor={equippedArmor
                                ? { name: equippedArmor.name, acBase: armorRef?.armorClass?.base }
                                : null}
                            shield={equippedShield
                                ? { name: equippedShield.name, acBase: shieldRef?.armorClass?.base ?? null }
                                : null}
                        />
                    </aside>
                </section>

                <InventoryPreviewCard
                    characterId={character.id}
                    items={inventoryPreview}
                    totalCount={character._count?.items ?? rawItems.length}
                    totalWeight={rawItems.reduce((sum, i) => sum + (i.weight ?? 0) * i.quantity, 0)}
                    totalQuantity={rawItems.reduce((sum, i) => sum + i.quantity, 0)}
                />

                <SpellbookCard characterId={character.id} spells={character.spells} />

                <ProficienciesCard proficiencies={proficiencies} />

                <ClassFeaturesCard features={featureDetails} />

                <FeatsCard
                    feats={feats}
                    acquiredLevel={levelLog?.toLevel ?? character.level}
                    acquiredAt={levelLog?.appliedAt ?? null}
                />
            </main>
        </div>
    );
}
