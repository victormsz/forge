import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { SpellTargetShape } from "@prisma/client";

import type { LevelUpChoicesMeta } from "@/lib/characters/types";
import { getCurrentActor } from "@/lib/current-actor";
import { prisma } from "@/lib/prisma";
import { ABILITY_KEYS, type AbilityKey } from "@/lib/point-buy";
import { calculateMaxHp, getHitDieValue } from "@/lib/characters/hit-dice";
import { SPELL_AFFINITY_LABELS, SPELL_SHAPE_LABELS } from "@/lib/spells/labels";

export const metadata: Metadata = {
    title: "ForgeSheet | Character Sheet",
    description: "Immersive single-character sheet inspired by the printable D&D layout.",
};

const abilityDetails: Record<AbilityKey, { label: string; blurb: string }> = {
    str: { label: "Strength", blurb: "Force · Athletics" },
    dex: { label: "Dexterity", blurb: "Agility · Reflex" },
    con: { label: "Constitution", blurb: "Endurance" },
    int: { label: "Intelligence", blurb: "Logic" },
    wis: { label: "Wisdom", blurb: "Insight" },
    cha: { label: "Charisma", blurb: "Presence" },
};

const generationLabels = {
    POINT_BUY: "Point Buy",
    RANDOM: "Random Rolls",
};

const SKILL_CONFIG = [
    { key: "acrobatics", label: "Acrobatics", ability: "dex" },
    { key: "animal handling", label: "Animal Handling", ability: "wis" },
    { key: "arcana", label: "Arcana", ability: "int" },
    { key: "athletics", label: "Athletics", ability: "str" },
    { key: "deception", label: "Deception", ability: "cha" },
    { key: "history", label: "History", ability: "int" },
    { key: "insight", label: "Insight", ability: "wis" },
    { key: "intimidation", label: "Intimidation", ability: "cha" },
    { key: "investigation", label: "Investigation", ability: "int" },
    { key: "medicine", label: "Medicine", ability: "wis" },
    { key: "nature", label: "Nature", ability: "int" },
    { key: "perception", label: "Perception", ability: "wis" },
    { key: "performance", label: "Performance", ability: "cha" },
    { key: "persuasion", label: "Persuasion", ability: "cha" },
    { key: "religion", label: "Religion", ability: "int" },
    { key: "sleight of hand", label: "Sleight of Hand", ability: "dex" },
    { key: "stealth", label: "Stealth", ability: "dex" },
    { key: "survival", label: "Survival", ability: "wis" },
] as const satisfies ReadonlyArray<{ key: string; label: string; ability: AbilityKey }>;

type CharacterSheetPageProps = {
    params: Promise<{ id: string }>;
};

type ProficiencyBuckets = {
    armor: string[];
    weapons: string[];
    tools: string[];
    skills: string[];
    languages: string[];
};

function normalizeAbilityScores(raw: unknown) {
    const scores: Record<AbilityKey, number> = {
        str: 10,
        dex: 10,
        con: 10,
        int: 10,
        wis: 10,
        cha: 10,
    };

    if (raw && typeof raw === "object") {
        ABILITY_KEYS.forEach((key) => {
            const maybeValue = (raw as Record<string, unknown>)[key];
            if (typeof maybeValue === "number") {
                scores[key] = maybeValue;
            }
        });
    }

    return scores;
}

function normalizeProficiencies(raw: unknown): ProficiencyBuckets {
    const buckets: ProficiencyBuckets = {
        armor: [],
        weapons: [],
        tools: [],
        skills: [],
        languages: [],
    };

    if (!raw || typeof raw !== "object") {
        return buckets;
    }

    const source = raw as Record<string, unknown>;

    (Object.keys(buckets) as (keyof ProficiencyBuckets)[]).forEach((key) => {
        const value = source[key];
        if (Array.isArray(value)) {
            buckets[key] = value.filter((entry): entry is string => typeof entry === "string");
        }
    });

    return buckets;
}

function normalizeSkillName(value: string) {
    return value.trim().toLowerCase();
}

function abilityModifier(score: number) {
    return Math.floor((score - 10) / 2);
}

function formatModifier(modifierValue: number) {
    return modifierValue >= 0 ? `+${modifierValue}` : modifierValue.toString();
}

function computeProficiencyBonus(level: number) {
    if (level <= 0) {
        return 2;
    }
    return Math.floor((level - 1) / 4) + 2;
}

function formatAbilityIncreases(choices: LevelUpChoicesMeta["abilityIncreases"]) {
    if (!Array.isArray(choices) || choices.length === 0) {
        return null;
    }

    return choices
        .map((choice) => `${choice.ability.toUpperCase()} +${choice.amount}`)
        .join(", ");
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
    const armorClass = 10 + abilityModifiers.dex + armorBonus + shieldBonus + miscBonus;
    const armorSegments = ["10 base", `${formatModifier(abilityModifiers.dex)} DEX`]
        .concat(armorBonus ? [`+${armorBonus} armor`] : [])
        .concat(shieldBonus ? [`+${shieldBonus} shield`] : [])
        .concat(miscBonus ? [`+${miscBonus} misc`] : [])
        .join(" · ");

    const hitDieValue = getHitDieValue(character.charClass);
    const hitDiceDisplay = `${character.level}d${hitDieValue}`;
    const maxHpEstimate = calculateMaxHp(character.level, hitDieValue, abilityModifiers.con);

    const proficiencies = normalizeProficiencies(character.proficiencies);
    const skillLookup = new Set(proficiencies.skills.map(normalizeSkillName));
    const skillSummaries = SKILL_CONFIG.map((skill) => {
        const proficient = skillLookup.has(skill.key);
        const base = abilityModifiers[skill.ability];
        const total = base + (proficient ? proficiencyBonus : 0);
        return {
            ...skill,
            proficient,
            total,
            base,
        };
    });
    const spells = character.spells;
    const shapeTotals: Record<SpellTargetShape, number> = {
        SINGLE: 0,
        AOE_CIRCLE: 0,
        CONE: 0,
        LINE: 0,
        SQUARE: 0,
    };

    spells.forEach((spell) => {
        shapeTotals[spell.shape] += 1;
    });

    const shapeEntries = (Object.entries(shapeTotals) as [SpellTargetShape, number][])
        .filter(([, count]) => count > 0)
        .sort(([, a], [, b]) => b - a);

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

    const ancestryLine = [character.ancestry, character.background, character.alignment]
        .filter(Boolean)
        .join(" · ") || "Awaiting ancestry, background, and alignment.";

    const infoTags = [
        generationLabels[character.generationMethod],
        actor.isGuest ? "Guest owner" : "Synced account",
        `Sheet ID ${character.id.slice(0, 6)}`,
    ];

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(250,232,214,0.18),_transparent_55%),_#030308] text-white">
            <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-16 sm:px-6 lg:px-8">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-rose-200">Character sheet</p>
                        <h1 className="text-3xl font-semibold text-white sm:text-4xl">{character.name}</h1>
                        <p className="text-sm text-white/70">{character.charClass ? `Level ${character.level} ${character.charClass}` : `Level ${character.level}`}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.3em] text-white/60">{ancestryLine}</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <Link
                            href="/characters"
                            className="rounded-full border border-white/20 px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:border-rose-200"
                        >
                            Back to roster
                        </Link>
                        <Link
                            href={`/characters/${character.id}/spells`}
                            className="rounded-full border border-white/20 px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:border-rose-200"
                        >
                            Manage spells
                        </Link>
                        <Link
                            href={`/characters/${character.id}/level-up`}
                            className="rounded-full border border-emerald-300/60 px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200 transition hover:bg-emerald-400/10"
                        >
                            Level up
                        </Link>
                        <Link
                            href={`/api/characters/${character.id}/sheet`}
                            prefetch={false}
                            className="rounded-full bg-gradient-to-r from-rose-400 to-amber-300 px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-black shadow-lg transition hover:shadow-rose-400/40"
                        >
                            Export PDF
                        </Link>
                    </div>
                </div>

                <section className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
                    <article className="rounded-[2.5rem] border border-white/10 bg-white/5 p-8 shadow-[0_25px_90px_rgba(0,0,0,0.55)]">
                        <div className="space-y-8">
                            <div className="flex flex-wrap items-center gap-3 text-[0.65rem] uppercase tracking-[0.3em] text-white/60">
                                {infoTags.map((tag) => (
                                    <span key={tag} className="rounded-full border border-white/20 px-3 py-1 text-white/80">
                                        {tag}
                                    </span>
                                ))}
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                                {ABILITY_KEYS.map((key) => (
                                    <div key={key} className="rounded-2xl border border-white/10 bg-black/30 p-4">
                                        <div className="flex items-baseline justify-between gap-2">
                                            <p className="text-[0.6rem] uppercase tracking-[0.4em] text-white/50">{abilityDetails[key].label}</p>
                                            <span className="text-[0.55rem] text-white/50">{abilityDetails[key].blurb}</span>
                                        </div>
                                        <div className="mt-3 flex items-end justify-between">
                                            <span className="text-4xl font-semibold text-white">{abilityScores[key]}</span>
                                            <span className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-white/80">
                                                {formatModifier(abilityModifiers[key])}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
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
                                        label: "Walking speed",
                                        value: `${walkingSpeed} ft`,
                                        detail: "Adjust for ancestry traits if needed.",
                                    },
                                    {
                                        label: "Proficiency bonus",
                                        value: `+${proficiencyBonus}`,
                                        detail: `Level ${character.level} progression`,
                                    },
                                    {
                                        label: "Hit dice",
                                        value: hitDiceDisplay,
                                        detail: character.charClass ? `${character.charClass} scaling` : "Default d8 assumption",
                                    },
                                    {
                                        label: "Max HP",
                                        value: maxHpEstimate,
                                        detail: `Full hit die at level 1, average rolls after + CON (${formatModifier(abilityModifiers.con)} each level)`,
                                    },
                                ].map((stat) => (
                                    <div key={stat.label} className="rounded-2xl border border-white/10 bg-black/30 p-4">
                                        <p className="text-[0.6rem] uppercase tracking-[0.4em] text-white/50">{stat.label}</p>
                                        <p className="mt-2 text-3xl font-semibold text-white">{stat.value}</p>
                                        <p className="mt-1 text-xs text-white/70">{stat.detail}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-3">
                                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/60">Skill checks</p>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    {skillSummaries.map((skill) => (
                                        <div
                                            key={skill.key}
                                            className={`rounded-2xl border px-4 py-3 ${skill.proficient
                                                ? "border-rose-300/60 bg-rose-300/10"
                                                : "border-white/10 bg-black/30"
                                                }`}
                                        >
                                            <div className="flex items-center justify-between text-[0.6rem] uppercase tracking-[0.3em] text-white/60">
                                                <span>{skill.label}</span>
                                                <span>{skill.ability.toUpperCase()}</span>
                                            </div>
                                            <div className="mt-2 flex items-baseline justify-between gap-3">
                                                <span className="text-2xl font-semibold text-white">{formatModifier(skill.total)}</span>
                                                <span className="text-xs text-white/70">
                                                    {skill.proficient ? `Proficient (+${proficiencyBonus})` : `Base ${formatModifier(skill.base)} mod`}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </article>

                    <aside className="space-y-6">
                        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                            <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-white/70">Builder log</h2>
                            <dl className="mt-4 space-y-3 text-sm">
                                <div className="flex items-center justify-between gap-3">
                                    <dt className="text-white/60">Sheet owner</dt>
                                    <dd className="text-white">{actor.name ?? actor.email ?? "Adventurer"}</dd>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                    <dt className="text-white/60">Generation method</dt>
                                    <dd className="text-white">{generationLabels[character.generationMethod]}</dd>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                    <dt className="text-white/60">Created</dt>
                                    <dd className="text-white">{character.createdAt.toLocaleDateString()}</dd>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                    <dt className="text-white/60">Last updated</dt>
                                    <dd className="text-white">{character.updatedAt.toLocaleDateString()}</dd>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <dt className="text-white/60">Level progression</dt>
                                    <dd className="text-white">{levelSummary}</dd>
                                    <dd className="text-xs text-white/60">{levelDetail}</dd>
                                </div>
                            </dl>
                        </div>

                        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                            <div className="flex items-center justify-between">
                                <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-white/70">Spell geometry</h2>
                                <span className="text-xs text-white/60">{spells.length} templates</span>
                            </div>
                            {shapeEntries.length ? (
                                <div className="mt-4 space-y-3">
                                    {shapeEntries.map(([shape, count]) => (
                                        <div key={shape} className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm">
                                            <span className="text-white/80">{SPELL_SHAPE_LABELS[shape]}</span>
                                            <span className="text-white font-semibold">{count}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="mt-4 text-sm text-white/60">No spell templates yet. Add spells to populate geometry insights.</p>
                            )}
                        </div>
                    </aside>
                </section>

                <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h2 className="text-lg font-semibold text-white">Spellbook preview</h2>
                            <p className="text-sm text-white/70">Pulled directly from your custom targeting data.</p>
                        </div>
                        <span className="text-xs uppercase tracking-[0.3em] text-white/60">{spells.length} total</span>
                    </div>
                    {spells.length === 0 ? (
                        <p className="mt-6 text-sm text-white/60">This character has no spells yet. Head back to the dashboard to add targeting templates.</p>
                    ) : (
                        <div className="mt-6 space-y-4">
                            {spells.map((spell) => (
                                <article key={spell.id} className="rounded-2xl border border-white/10 bg-black/30 p-4">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div>
                                            <p className="text-xs uppercase tracking-[0.35em] text-white/50">Level {spell.level}</p>
                                            <h3 className="text-xl font-semibold text-white">{spell.name}</h3>
                                        </div>
                                        <span className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-white/80">
                                            {SPELL_SHAPE_LABELS[spell.shape]}
                                        </span>
                                    </div>
                                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-white/70">
                                        <span className="rounded-full border border-white/10 px-3 py-1">{SPELL_AFFINITY_LABELS[spell.affinity]}</span>
                                        <span className="rounded-full border border-white/10 px-3 py-1">Range: {spell.range ?? "Self"}</span>
                                        {spell.school && (
                                            <span className="rounded-full border border-white/10 px-3 py-1">{spell.school}</span>
                                        )}
                                        {spell.damage && (
                                            <span className="rounded-full border border-white/10 px-3 py-1">Damage: {spell.damage}</span>
                                        )}
                                    </div>
                                    {spell.description && (
                                        <p className="mt-3 text-sm text-white/70">{spell.description}</p>
                                    )}
                                </article>
                            ))}
                        </div>
                    )}
                </section>

                <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h2 className="text-lg font-semibold text-white">Proficiencies & languages</h2>
                            <p className="text-sm text-white/70">These tags mirror what you entered during creation.</p>
                        </div>
                        <span className="text-xs uppercase tracking-[0.3em] text-white/60">
                            {Object.values(proficiencies).reduce((total, list) => total + list.length, 0)} entries
                        </span>
                    </div>
                    <div className="mt-6 grid gap-4 md:grid-cols-2">
                        {(Object.entries(proficiencies) as [keyof ProficiencyBuckets, string[]][]).map(([key, list]) => (
                            <article key={key} className="rounded-2xl border border-white/10 bg-black/30 p-4">
                                <p className="text-xs font-semibold uppercase tracking-[0.4em] text-white/50">{key.charAt(0).toUpperCase() + key.slice(1)}</p>
                                {list.length ? (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {list.map((item) => (
                                            <span key={item} className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/80">
                                                {item}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="mt-3 text-sm text-white/50">No entries logged.</p>
                                )}
                            </article>
                        ))}
                    </div>
                </section>
            </main>
        </div>
    );
}
