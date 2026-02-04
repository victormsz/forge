import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";

import type { CharacterProficiencies, LevelUpChoicesMeta } from "@/lib/characters/types";
import { getCurrentActor } from "@/lib/current-actor";
import { prisma } from "@/lib/prisma";
import { ABILITY_KEYS, type AbilityKey } from "@/lib/point-buy";
import { calculateMaxHp, getHitDieValue } from "@/lib/characters/hit-dice";
import { SPELL_AFFINITY_LABELS } from "@/lib/spells/labels";
import { formatSubclassName } from "@/lib/characters/level-up-options";
import { getFeaturesUpToLevel, getSubclassFeaturesUpToLevel } from "@/lib/characters/leveling/level-data";
import { withFeatureDescriptions } from "@/lib/characters/leveling/feature-data";
import { findReferenceItemById, type ItemReference } from "@/lib/items/reference";
import {
    abilityModifier,
    buildSkillSummaries,
                                <div>
                                    <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-white/60">Combat Stats</h2>
                                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                                        {[
                                            {
                                                label: "Armor Class",
                                                value: armorClass,
                                                detail: armorSegments,
                                            },
                                            {
                                                label: "Initiative",
                                                value: formatModifier(abilityModifiers.dex),
                                                detail: "Dexterity modifier",
                                            },
                                            {
                                                label: "Speed",
                                                value: `${walkingSpeed} ft`,
                                                detail: "Walking speed",
                                            },
                                            {
                                                label: "Proficiency",
                                                value: `+${proficiencyBonus}`,
                                                detail: `Level ${character.level}`,
                                            },
                                            {
                                                label: "Hit Dice",
                                                value: hitDiceDisplay,
                                                detail: character.charClass || "Default d8",
                                            },
                                            {
                                                label: "Max HP",
                                                value: maxHpEstimate,
                                                detail: "Full die plus average rolls and CON",
                                            },
                                        ].map((stat) => (
                                            <div key={stat.label} className="rounded-2xl border border-white/15 bg-gradient-to-br from-black/40 to-black/20 p-4">
                                                <div className="mb-2 text-xs uppercase tracking-wider text-white/60">{stat.label}</div>
                                                <div className="text-3xl font-bold text-white">{stat.value}</div>
                                                <p className="mt-2 text-xs text-white/50">{stat.detail}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-white/60">Skills</h2>
                                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                                        {skillSummaries.map((skill) => (
                                            <div
                                                key={skill.label}
                                                className={`rounded-2xl border p-4 ${
                                                    skill.proficient
                                                        ? "border-rose-400/40 bg-rose-400/10"
                                                        : "border-white/15 bg-gradient-to-br from-black/40 to-black/20"
                                                }`}
                                            >
                                                <div className="mb-2 flex items-center justify-between text-[0.65rem] font-bold uppercase tracking-wider">
                                                    <span className={skill.proficient ? "text-rose-300" : "text-white/60"}>{skill.label}</span>
                                                    <span className="text-white/50">{skill.ability.toUpperCase()}</span>
                                                </div>
                                                <div className="flex items-baseline justify-between gap-3">
                                                    <span className="text-2xl font-bold text-white">{formatModifier(skill.total)}</span>
                                                    <span className="text-xs text-white/70">
                                                        {skill.proficient ? `+${proficiencyBonus} prof` : `${formatModifier(skill.base)} base`}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
    },
    {
        title: "Movement",
        hint: "Movement is separate from your action.",
        items: [
            { name: "Move", detail: "Up to your speed; split before and after actions." },
            { name: "Jump", detail: "Long or high jump based on Strength and movement." },
            { name: "Climb, Swim, Crawl", detail: "Movement modes that can cost extra speed." },
            { name: "Stand Up", detail: "Spend movement to rise from prone." },
            { name: "Interact with Object", detail: "Draw a weapon, open a door, etc." },
        ],
    },
];

type CharacterSheetPageProps = {
    params: Promise<{ id: string }>;
};

type EquippedSlot = "MAIN_HAND" | "OFF_HAND" | "ARMOR" | "SHIELD";

function formatAbilityIncreases(choices: LevelUpChoicesMeta["abilityIncreases"]) {
    if (!Array.isArray(choices) || choices.length === 0) {
        return null;
    }

    return choices
        .map((choice) => `${choice.ability.toUpperCase()} +${choice.amount}`)
        .join(", ");
}

function parseDamageLabel(damageLabel: string | null) {
    if (!damageLabel) {
        return null;
    }
    const base = damageLabel.split(" (")[0] ?? damageLabel;
    const match = base.match(/^(\d+d\d+)\s*(.*)?$/i);
    if (!match) {
        return null;
    }
    return {
        dice: match[1],
        damageType: match[2]?.trim() || null,
        label: base,
    };
}

function chooseWeaponAbilityModifier(reference: ItemReference | null, abilityModifiers: Record<AbilityKey, number>) {
    const properties = reference?.properties?.map((property) => property.toLowerCase()) ?? [];
    const isFinesse = properties.includes("finesse");
    const isRanged = properties.includes("range") || properties.includes("ammunition");
    if (isRanged) {
        return abilityModifiers.dex;
    }
    if (isFinesse) {
        return Math.max(abilityModifiers.dex, abilityModifiers.str);
    }
    return abilityModifiers.str;
}

function formatWeaponDamage(reference: ItemReference | null, abilityModifiers: Record<AbilityKey, number>) {
    const parsed = parseDamageLabel(reference?.damageLabel ?? null);
    if (!parsed) {
        return null;
    }
    const modifier = chooseWeaponAbilityModifier(reference, abilityModifiers);
    const modifierLabel = modifier === 0 ? "" : modifier > 0 ? ` + ${modifier}` : ` - ${Math.abs(modifier)}`;
    const typeLabel = parsed.damageType ? ` ${parsed.damageType}` : "";
    return `${parsed.dice}${modifierLabel}${typeLabel}`;
}

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

export default async function CharacterSheetPage({ params }: CharacterSheetPageProps) {
    const { id } = await params;
    const actor = await getCurrentActor();

    if (!actor) {
        redirect("/");
    }

    const character = await prisma.character.findFirst({
        where: { id, userId: actor.userId },
        include: {
            spells: {
                orderBy: [
                    { level: "asc" },
                    { name: "asc" },
                ],
            },
            items: {
                orderBy: [
                    { updatedAt: "desc" },
                    { name: "asc" },
                ],
                take: 6,
                select: {
                    id: true,
                    name: true,
                    category: true,
                    cost: true,
                    weight: true,
                    quantity: true,
                    description: true,
                    notes: true,
                    referenceId: true,
                    equippedSlot: true,
                    isCustom: true,
                    updatedAt: true,
                },
            },
            _count: {
                select: { items: true },
            },
        },
    });

    if (!character) {
        notFound();
    }

    const abilityScores = normalizeAbilityScores(character.abilityScores);
    const abilityModifiers = ABILITY_KEYS.reduce((acc, key) => {
        acc[key] = abilityModifier(abilityScores[key]);
        return acc;
    }, {} as Record<AbilityKey, number>);
    const proficiencyBonus = computeProficiencyBonus(character.level);
    const walkingSpeed = 30;
    const armorBonus = character.armorBonus ?? 0;
    const shieldBonus = character.shieldBonus ?? 0;
    const miscBonus = character.miscBonus ?? 0;

    const hitDieValue = getHitDieValue(character.charClass);
    const hitDiceDisplay = `${character.level}d${hitDieValue}`;
    const maxHpEstimate = calculateMaxHp(character.level, hitDieValue, abilityModifiers.con);

    const proficiencies: CharacterProficiencies = normalizeProficiencies(character.proficiencies);
    const skillSummaries = buildSkillSummaries(proficiencies, abilityModifiers, proficiencyBonus);
    const spells = character.spells;
    const inventoryItems = character.items ?? [];
    const inventoryPreview = inventoryItems.map((item) => {
        const reference = item.referenceId ? findReferenceItemById(item.referenceId) : null;
        const masteryTag = reference?.detailTags.find((tag) => tag.startsWith("Mastery:")) ?? null;
        const isWeapon = reference?.categories?.some((category) => /weapon/i.test(category)) ?? false;
        return {
            ...item,
            damageLabel: reference?.damageLabel ?? null,
            rangeLabel: reference?.rangeLabel ?? null,
            weaponProperties: isWeapon ? reference?.properties ?? [] : [],
            masteryTag: isWeapon ? masteryTag : null,
            equippedSlot: (item.equippedSlot as EquippedSlot | null) ?? null,
        };
    });
    const equippedMainHand = inventoryPreview.find((item) => item.equippedSlot === "MAIN_HAND") ?? null;
    const equippedOffHand = inventoryPreview.find((item) => item.equippedSlot === "OFF_HAND") ?? null;
    const equippedArmor = inventoryPreview.find((item) => item.equippedSlot === "ARMOR") ?? null;
    const equippedShield = inventoryPreview.find((item) => item.equippedSlot === "SHIELD") ?? null;

    const mainHandReference = equippedMainHand?.referenceId ? findReferenceItemById(equippedMainHand.referenceId) : null;
    const offHandReference = equippedOffHand?.referenceId ? findReferenceItemById(equippedOffHand.referenceId) : null;
    const armorReference = equippedArmor?.referenceId ? findReferenceItemById(equippedArmor.referenceId) : null;
    const shieldReference = equippedShield?.referenceId ? findReferenceItemById(equippedShield.referenceId) : null;

    const mainHandDamage = formatWeaponDamage(mainHandReference, abilityModifiers);
    const offHandDamage = formatWeaponDamage(offHandReference, abilityModifiers);

    const armorBase = computeArmorBase(armorReference, abilityModifiers.dex);
    const shieldGearBonus = shieldReference?.armorClass?.base ?? 0;
    const armorClass = armorBase + shieldGearBonus + armorBonus + shieldBonus + miscBonus;
    const armorSegments = [
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
    const inventoryTotalCount = character._count?.items ?? inventoryItems.length;
    const totalInventoryWeight = inventoryItems.reduce((sum, item) => sum + (item.weight ?? 0) * item.quantity, 0);
    const totalInventoryQuantity = inventoryItems.reduce((sum, item) => sum + item.quantity, 0);

    const levelLog = character.levelUpChoices as LevelUpChoicesMeta | null;
    const abilityIncreaseSummary = levelLog ? formatAbilityIncreases(levelLog.abilityIncreases) : null;
    const levelSummary = levelLog
        ? `Advanced to level ${levelLog.toLevel}`
        : `Level ${character.level}`;
    const levelDetail = levelLog
        ? [
            levelLog.subclass ? `Subclass: ${levelLog.subclass}` : null,
            levelLog.feat ? `Feat: ${levelLog.feat}` : null,
            abilityIncreaseSummary ? `ASI: ${abilityIncreaseSummary}` : null,
            levelLog.appliedAt ? `Applied ${new Date(levelLog.appliedAt).toLocaleDateString()}` : null,
        ]
            .filter(Boolean)
            .join(" · ") || "Level up recorded (details unavailable)."
        : "No level-up records yet.";

    // Collect feats from level-up choices
    const feats: string[] = [];
    if (levelLog?.feat) {
        feats.push(levelLog.feat);
    }

    const classFeatures = getFeaturesUpToLevel(character.charClass, character.level);
    const subclassFeatures = character.subclass
        ? getSubclassFeaturesUpToLevel(character.charClass, character.subclass, character.level)
        : [];
    const featureDetails = (() => {
        const seen = new Set<string>();
        return withFeatureDescriptions([...classFeatures, ...subclassFeatures]).filter((feature) => {
            if (seen.has(feature.index)) {
                return false;
            }
            seen.add(feature.index);
            return true;
        });
    })();

    const ancestryLine = [character.ancestry, character.background, character.alignment]
        .filter(Boolean)
        .join(" · ") || "Awaiting ancestry, background, and alignment.";

    const infoTags = [
        generationLabels[character.generationMethod],
        actor.isGuest ? "Guest owner" : "Synced account",
        `Sheet ID ${character.id.slice(0, 6)}`,
    ];

    return (
        <div className="min-h-screen bg-forge text-white">
            <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-12 sm:px-6 lg:px-8">
                <div className="flex flex-wrap items-start justify-between gap-6">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-rose-200">Character Sheet</p>
                            <div className="flex-1 h-px bg-gradient-to-r from-rose-200/30 to-transparent"></div>
                        </div>
                        <h1 className="text-4xl font-bold text-white sm:text-5xl truncate">{character.name}</h1>
                        <p className="mt-2 text-lg text-white/80">
                            {character.charClass
                                ? `Level ${character.level} ${character.charClass}${character.subclass ? ` (${formatSubclassName(character.subclass)})` : ''}`
                                : `Level ${character.level}`}
                        </p>
                        <p className="mt-1 text-sm text-white/60">{ancestryLine}</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <Link
                            href="/characters"
                            className="rounded-xl border border-white/30 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10 hover:border-white/50"
                        >
                            Back to roster
                        </Link>
                        <Link
                            href={`/characters/${character.id}/items`}
                            className="rounded-xl border border-sky-400/40 bg-sky-400/10 px-5 py-2.5 text-sm font-semibold text-sky-200 transition hover:bg-sky-400/20"
                        >
                            Inventory
                        </Link>
                        <Link
                            href={`/characters/${character.id}/spells`}
                            className="rounded-xl border border-blue-400/40 bg-blue-400/10 px-5 py-2.5 text-sm font-semibold text-blue-300 transition hover:bg-blue-400/20"
                        >
                            Spells
                        </Link>
                        <Link
                            href={`/characters/${character.id}/level-up`}
                            className="rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-5 py-2.5 text-sm font-bold text-emerald-300 transition hover:bg-emerald-400/20"
                        >
                            Level up
                        </Link>
                        <Link
                            href={`/api/characters/${character.id}/sheet`}
                            prefetch={false}
                            className="rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 px-6 py-2.5 text-sm font-bold text-white shadow-lg transition hover:shadow-rose-400/40 hover:scale-[1.02]"
                        >
                            Export PDF
                        </Link>
                    </div>
                </div>

                <section className="grid gap-6 lg:grid-cols-[1fr_320px]">
                    <article className="rounded-3xl border border-white/15 bg-gradient-to-br from-white/10 to-white/5 p-8 shadow-2xl backdrop-blur-sm">
                        <div className="space-y-8">
                            <div className="flex flex-wrap items-center gap-2.5 text-[0.65rem]">
                                {infoTags.map((tag) => (
                                    <span key={tag} className="rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-white/70">
                                        {tag}
                                    </span>
                                ))}
                            </div>

                            <div>
                                <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-white/60">Ability Scores</h2>
                                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                                    {ABILITY_KEYS.map((key) => (
                                        <div key={key} className="rounded-2xl border border-white/15 bg-gradient-to-br from-black/40 to-black/20 p-4">
                                            <div className="flex items-baseline justify-between gap-2 mb-3">
                                                <p className="text-[0.6rem] font-bold uppercase tracking-wider text-white/60">{abilityDetails[key].label}</p>
                                            </div>
                                            <div className="flex items-end justify-between gap-2">
                                                <span className="text-4xl font-bold text-white">{abilityScores[key]}</span>
                                                <span className="rounded-xl border border-white/30 bg-white/10 px-3 py-1.5 text-sm font-bold text-white">
                                                    {formatModifier(abilityModifiers[key])}
                                                </span>
                                            </div>
                                            <p className="mt-2 text-[0.6rem] text-white/50">{abilityDetails[key].blurb}</p>
                                        </div>
                                    ))}
                                </div>

                                <div>
                                    <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-white/60">Combat Stats</h2>
                                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                                        {[
                                            {
                                                label: "Armor Class",
                                                value: armorClass,
                                                detail: armorSegments,
                                            },
                                            {
                                                label: "Initiative",
                                                value: formatModifier(abilityModifiers.dex),
                                                detail: "Dexterity modifier",
                                            },
                                            {
                                                label: "Speed",
                                                value: `${walkingSpeed} ft`,
                                                detail: "Walking speed",
                                            },
                                            {
                                                label: "Proficiency",
                                                value: `+${proficiencyBonus}`,
                                                detail: `Level ${character.level}`,
                                            },
                                            {
                                                label: "Hit Dice",
                                                value: hitDiceDisplay,
                                                detail: character.charClass || "Default d8",
                                            },
                                            {
                                                label: "Max HP",
                                                value: maxHpEstimate,
                                                detail: "Full die plus average rolls and CON",
                                            },
                                        ].map((stat) => (
                                            <div key={stat.label} className="rounded-2xl border border-white/15 bg-gradient-to-br from-black/40 to-black/20 p-4">
                                                <div className="mb-2 text-xs uppercase tracking-wider text-white/60">{stat.label}</div>
                                                <div className="text-3xl font-bold text-white">{stat.value}</div>
                                                <p className="mt-2 text-xs text-white/50">{stat.detail}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-white/60">Skills</h2>
                                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                                        {skillSummaries.map((skill) => (
                                            <div
                                                key={skill.label}
                                                className={`rounded-2xl border p-4 ${
                                                    skill.proficient
                                                        ? "border-rose-400/40 bg-rose-400/10"
                                                        : "border-white/15 bg-gradient-to-br from-black/40 to-black/20"
                                                }`}
                                            >
                                                <div className="mb-2 flex items-center justify-between text-[0.65rem] font-bold uppercase tracking-wider">
                                                    <span className={skill.proficient ? "text-rose-300" : "text-white/60"}>{skill.label}</span>
                                                    <span className="text-white/50">{skill.ability.toUpperCase()}</span>
                                                </div>
                                                <div className="flex items-baseline justify-between gap-3">
                                                    <span className="text-2xl font-bold text-white">{formatModifier(skill.total)}</span>
                                                    <span className="text-xs text-white/70">
                                                        {skill.proficient ? `+${proficiencyBonus} prof` : `${formatModifier(skill.base)} base`}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-white/60">Core Actions</h2>
                                        <p className="mb-4 text-sm text-white/60">
                                            Corebook action, bonus action, reaction, and movement options for a turn.
                                        </p>
                                        <div className="grid gap-4 lg:grid-cols-2">
                                            {COREBOOK_ACTION_GROUPS.map((group) => (
                                                <article
                                                    key={group.title}
                                                    className="rounded-2xl border border-white/15 bg-gradient-to-br from-black/40 to-black/20 p-4"
                                                >
                                                    <div className="flex items-center justify-between gap-3 mb-3">
                                                        <div>
                                                            <h3 className="text-sm font-bold uppercase tracking-wider text-white/70">
                                                                {group.title}
                                                            </h3>
                                                            <p className="text-xs text-white/50">{group.hint}</p>
                                                        </div>
                                                    </div>
                                                    <ul className="space-y-2">
                                                        {group.items.map((item) => (
                                                            <li key={item.name} className="text-sm text-white/80">
                                                                <span className="font-semibold text-white">{item.name}</span>
                                                                <span className="text-white/60">: {item.detail}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </article>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </article>

                    <aside className="space-y-6">
                        <div className="rounded-2xl border border-white/15 bg-gradient-to-br from-white/10 to-white/5 p-6 backdrop-blur-sm">
                            <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-white/70">Character Info</h2>
                            <dl className="mt-4 space-y-3.5 text-sm">
                                <div>
                                    <dt className="text-xs font-bold uppercase tracking-wider text-white/50 mb-1">Owner</dt>
                                    <dd className="text-white">{actor.name ?? actor.email ?? "Adventurer"}</dd>
                                </div>
                                <div>
                                    <dt className="text-xs font-bold uppercase tracking-wider text-white/50 mb-1">Generation</dt>
                                    <dd className="text-white">{generationLabels[character.generationMethod]}</dd>
                                </div>
                                <div>
                                    <dt className="text-xs font-bold uppercase tracking-wider text-white/50 mb-1">Created</dt>
                                    <dd className="text-white">{character.createdAt.toLocaleDateString()}</dd>
                                </div>
                                <div>
                                    <dt className="text-xs font-bold uppercase tracking-wider text-white/50 mb-1">Last Updated</dt>
                                    <dd className="text-white">{character.updatedAt.toLocaleDateString()}</dd>
                                </div>
                                <div className="pt-2 border-t border-white/10">
                                    <dt className="text-xs font-bold uppercase tracking-wider text-white/50 mb-1">Level Progress</dt>
                                    <dd className="text-white font-semibold">{levelSummary}</dd>
                                    <dd className="mt-1 text-xs text-white/60">{levelDetail}</dd>
                                </div>
                            </dl>
                        </div>

                        <div className="rounded-2xl border border-white/15 bg-gradient-to-br from-white/10 to-white/5 p-6 backdrop-blur-sm">
                            <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-white/70">Equipment Loadout</h2>
                            <div className="space-y-4 text-sm">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wider text-white/50 mb-1">Main Hand</p>
                                    <p className="text-white font-semibold">{equippedMainHand?.name ?? "None"}</p>
                                    {mainHandDamage && <p className="text-xs text-white/60">{mainHandDamage}</p>}
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wider text-white/50 mb-1">Off Hand</p>
                                    <p className="text-white font-semibold">{equippedOffHand?.name ?? "None"}</p>
                                    {offHandDamage && <p className="text-xs text-white/60">{offHandDamage}</p>}
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wider text-white/50 mb-1">Armor</p>
                                    <p className="text-white font-semibold">{equippedArmor?.name ?? "None"}</p>
                                    {armorReference?.armorClass && (
                                        <p className="text-xs text-white/60">AC {armorReference.armorClass.base}</p>
                                    )}
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wider text-white/50 mb-1">Shield</p>
                                    <p className="text-white font-semibold">{equippedShield?.name ?? "None"}</p>
                                    {shieldGearBonus ? <p className="text-xs text-white/60">+{shieldGearBonus} AC</p> : null}
                                </div>
                            </div>
                        </div>

                    </aside>
                </section>

                <section className="rounded-2xl border border-white/15 bg-gradient-to-br from-white/10 to-white/5 p-6 backdrop-blur-sm">
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                        <div>
                            <h2 className="text-xl font-bold text-white">Inventory Preview</h2>
                            <p className="mt-1 text-sm text-white/70">Recent kit additions and carried weight.</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="rounded-xl border border-sky-400/40 bg-sky-400/10 px-4 py-2 text-sm font-bold text-sky-200">
                                {inventoryTotalCount} Items
                            </span>
                            <Link
                                href={`/characters/${character.id}/items`}
                                className="text-sm font-semibold text-sky-300 hover:text-sky-100 transition"
                            >
                                Open inventory
                            </Link>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs uppercase tracking-[0.3em] text-white/60">
                        <span className="rounded-full border border-white/20 px-4 py-1.5 text-white/80">
                            {totalInventoryWeight.toFixed(1)} lb carried
                        </span>
                        <span className="rounded-full border border-white/20 px-4 py-1.5 text-white/80">
                            {totalInventoryQuantity} pieces tracked
                        </span>
                    </div>
                    {inventoryPreview.length === 0 ? (
                        <div className="mt-6 rounded-xl border border-dashed border-white/20 bg-black/20 p-6 text-center">
                            <p className="text-white/60">No inventory entries yet.</p>
                            <Link
                                href={`/characters/${character.id}/items`}
                                className="mt-3 inline-block text-sm font-semibold text-sky-300 hover:text-sky-100 transition"
                            >
                                Start packing
                            </Link>
                        </div>
                    ) : (
                        <div className="mt-6 grid gap-4 sm:grid-cols-2">
                            {inventoryPreview.map((item) => (
                                <article key={item.id} className="rounded-xl border border-white/15 bg-gradient-to-br from-black/40 to-black/20 p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="text-xs uppercase tracking-[0.35em] text-white/50">{item.category ?? "Misc gear"}</p>
                                            <h3 className="text-lg font-bold text-white">{item.name}</h3>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-2xl font-bold text-white">{item.quantity}</p>
                                            <p className="text-[0.65rem] uppercase tracking-[0.3em] text-white/50">Qty</p>
                                        </div>
                                    </div>
                                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/70">
                                        {item.cost && (
                                            <span className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1">{item.cost}</span>
                                        )}
                                        {typeof item.weight === "number" && (
                                            <span className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1">{(item.weight * item.quantity).toFixed(1)} lb</span>
                                        )}
                                        {item.damageLabel && (
                                            <span className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-2.5 py-1 text-rose-200">
                                                {item.damageLabel}
                                            </span>
                                        )}
                                        {item.rangeLabel && (
                                            <span className="rounded-lg border border-blue-400/30 bg-blue-400/10 px-2.5 py-1 text-blue-200">
                                                {item.rangeLabel}
                                            </span>
                                        )}
                                        {item.masteryTag && (
                                            <span className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-amber-200">
                                                {item.masteryTag}
                                            </span>
                                        )}
                                        {item.weaponProperties.slice(0, 3).map((property) => (
                                            <span
                                                key={`${item.id}-${property}`}
                                                className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-emerald-200"
                                            >
                                                {property}
                                            </span>
                                        ))}
                                        <span className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1">{item.isCustom ? "Custom" : "SRD"}</span>
                                    </div>
                                    {(item.notes || item.description) && (
                                        <p className="mt-3 text-sm text-white/70">{item.notes ?? item.description}</p>
                                    )}
                                    <p className="mt-3 text-[0.65rem] uppercase tracking-[0.3em] text-white/50">Updated {item.updatedAt.toLocaleDateString()}</p>
                                </article>
                            ))}
                        </div>
                    )}
                </section>

                <section className="rounded-2xl border border-white/15 bg-gradient-to-br from-white/10 to-white/5 p-6 backdrop-blur-sm">
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                        <div>
                            <h2 className="text-xl font-bold text-white">Spellbook</h2>
                            <p className="mt-1 text-sm text-white/70">Known spells and abilities</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="rounded-xl border border-blue-400/40 bg-blue-400/10 px-4 py-2 text-sm font-bold text-blue-300">
                                {spells.length} Spells
                            </span>
                            <Link
                                href={`/characters/${character.id}/spells`}
                                className="text-sm font-semibold text-rose-300 hover:text-rose-200 transition"
                            >
                                Manage spells
                            </Link>
                        </div>
                    </div>
                    {spells.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-white/20 bg-black/20 p-8 text-center">
                            <p className="text-white/60">No spells learned yet.</p>
                            <Link
                                href={`/characters/${character.id}/spells`}
                                className="mt-3 inline-block text-sm font-semibold text-rose-300 hover:text-rose-200 transition"
                            >
                                Add your first spell
                            </Link>
                        </div>
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2">
                            {spells.map((spell) => (
                                <article key={spell.id} className="rounded-xl border border-white/15 bg-gradient-to-br from-black/40 to-black/20 p-4">
                                    <div className="flex items-start justify-between gap-3 mb-3">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="rounded-lg bg-blue-400/20 px-2 py-0.5 text-xs font-bold text-blue-300">
                                                    Lvl {spell.level}
                                                </span>
                                                {spell.school && (
                                                    <span className="text-xs text-white/50">{spell.school}</span>
                                                )}
                                            </div>
                                            <h3 className="text-lg font-bold text-white">{spell.name}</h3>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2 text-xs mb-3">
                                        <span className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-white/70">
                                            {SPELL_AFFINITY_LABELS[spell.affinity]}
                                        </span>
                                        <span className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-white/70">
                                            {spell.range ?? "Self"}
                                        </span>
                                        {spell.damage && (
                                            <span className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-2.5 py-1 text-rose-300">
                                                {spell.damage}
                                            </span>
                                        )}
                                    </div>
                                    {spell.description && (
                                        <p className="text-sm text-white/70 line-clamp-2">{spell.description}</p>
                                    )}
                                </article>
                            ))}
                        </div>
                    )}
                </section>

                <section className="rounded-2xl border border-white/15 bg-gradient-to-br from-white/10 to-white/5 p-6 backdrop-blur-sm">
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                        <div>
                            <h2 className="text-xl font-bold text-white">Proficiencies & Languages</h2>
                            <p className="mt-1 text-sm text-white/70">Skills, weapons, armor, and languages</p>
                        </div>
                        <span className="rounded-xl border border-purple-400/40 bg-purple-400/10 px-4 py-2 text-sm font-bold text-purple-300">
                            {Object.values(proficiencies).reduce((total, list) => total + list.length, 0)} Total
                        </span>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                        {(Object.entries(proficiencies) as [keyof CharacterProficiencies, string[]][]).map(([key, list]) => (
                            <article key={key} className="rounded-xl border border-white/15 bg-gradient-to-br from-black/40 to-black/20 p-4">
                                <p className="mb-3 text-sm font-bold uppercase tracking-wider text-white/60">{key.charAt(0).toUpperCase() + key.slice(1)}</p>
                                {list.length ? (
                                    <div className="flex flex-wrap gap-2">
                                        {list.map((item) => (
                                            <span key={item} className="rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/80">
                                                {item}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-white/40">None</p>
                                )}
                            </article>
                        ))}
                    </div>
                </section>

                <section className="rounded-2xl border border-white/15 bg-gradient-to-br from-white/10 to-white/5 p-6 backdrop-blur-sm">
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                        <div>
                            <h2 className="text-xl font-bold text-white">Class Features</h2>
                            <p className="mt-1 text-sm text-white/70">Abilities gained from your class and subclass</p>
                        </div>
                        <span className="rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-4 py-2 text-sm font-bold text-emerald-300">
                            {featureDetails.length} {featureDetails.length === 1 ? "Feature" : "Features"}
                        </span>
                    </div>
                    {featureDetails.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-white/20 bg-black/20 p-8 text-center">
                            <p className="text-white/60">No class features tracked yet.</p>
                            <p className="mt-2 text-sm text-white/50">Choose a class to unlock your feature list.</p>
                        </div>
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2">
                            {featureDetails.map((feature) => (
                                <article key={feature.index} className="rounded-xl border border-emerald-400/20 bg-gradient-to-br from-emerald-400/10 to-emerald-400/5 p-5">
                                    <h3 className="text-lg font-bold text-white">{feature.name}</h3>
                                    {feature.desc.length > 0 ? (
                                        <div className="mt-2 space-y-1 text-sm text-white/70">
                                            {feature.desc.map((line, index) => (
                                                <p key={`${feature.index}-${index}`} className="leading-relaxed">
                                                    {line}
                                                </p>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="mt-2 text-sm text-white/50">Description not available.</p>
                                    )}
                                </article>
                            ))}
                        </div>
                    )}
                </section>

                <section className="rounded-2xl border border-white/15 bg-gradient-to-br from-white/10 to-white/5 p-6 backdrop-blur-sm">
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                        <div>
                            <h2 className="text-xl font-bold text-white">Feats</h2>
                            <p className="mt-1 text-sm text-white/70">Special abilities and character features</p>
                        </div>
                        <span className="rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-2 text-sm font-bold text-amber-300">
                            {feats.length} {feats.length === 1 ? 'Feat' : 'Feats'}
                        </span>
                    </div>
                    {feats.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-white/20 bg-black/20 p-8 text-center">
                            <p className="text-white/60">No feats acquired yet.</p>
                            <p className="mt-2 text-sm text-white/50">Feats are typically gained at levels 4, 8, 12, 16, and 19.</p>
                        </div>
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2">
                            {feats.map((feat, index) => (
                                <article key={`${feat}-${index}`} className="rounded-xl border border-amber-400/30 bg-gradient-to-br from-amber-400/10 to-amber-400/5 p-5">
                                    <div className="flex items-start justify-between gap-3 mb-2">
                                        <div>
                                            <h3 className="text-lg font-bold text-white">{feat}</h3>
                                        </div>
                                    </div>
                                    <div className="mt-3 flex items-center gap-2 text-xs">
                                        <span className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-amber-300 font-semibold">
                                            Level {levelLog?.toLevel ?? character.level}
                                        </span>
                                        {levelLog?.appliedAt && (
                                            <span className="text-white/50">
                                                Acquired {new Date(levelLog.appliedAt).toLocaleDateString()}
                                            </span>
                                        )}
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}

