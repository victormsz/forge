import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";

import type { CharacterProficiencies, LevelUpChoicesMeta } from "@/lib/characters/types";
import { getCurrentActor } from "@/lib/current-actor";
import { prisma } from "@/lib/prisma";
import { ABILITY_KEYS, type AbilityKey } from "@/lib/point-buy";
import { calculateMaxHp, getHitDieValue } from "@/lib/characters/hit-dice";
import { SPELL_AFFINITY_LABELS } from "@/lib/spells/labels";
import {
    abilityModifier,
    buildSkillSummaries,
    computeProficiencyBonus,
    formatModifier,
    normalizeAbilityScores,
    normalizeProficiencies,
} from "@/lib/characters/statistics";

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

type CharacterSheetPageProps = {
    params: Promise<{ id: string }>;
};

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
                    notes: true,
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
    const armorClass = 10 + abilityModifiers.dex + armorBonus + shieldBonus + miscBonus;
    const armorSegments = ["10 base", `${formatModifier(abilityModifiers.dex)} DEX`]
        .concat(armorBonus ? [`+${armorBonus} armor`] : [])
        .concat(shieldBonus ? [`+${shieldBonus} shield`] : [])
        .concat(miscBonus ? [`+${miscBonus} misc`] : [])
        .join(" · ");

    const hitDieValue = getHitDieValue(character.charClass);
    const hitDiceDisplay = `${character.level}d${hitDieValue}`;
    const maxHpEstimate = calculateMaxHp(character.level, hitDieValue, abilityModifiers.con);

    const proficiencies: CharacterProficiencies = normalizeProficiencies(character.proficiencies);
    const skillSummaries = buildSkillSummaries(proficiencies, abilityModifiers, proficiencyBonus);
    const spells = character.spells;
    const inventoryItems = character.items ?? [];
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
            <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-12 sm:px-6 lg:px-8">
                <div className="flex flex-wrap items-start justify-between gap-6">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-rose-200">Character Sheet</p>
                            <div className="flex-1 h-px bg-gradient-to-r from-rose-200/30 to-transparent"></div>
                        </div>
                        <h1 className="text-4xl font-bold text-white sm:text-5xl truncate">{character.name}</h1>
                        <p className="mt-2 text-lg text-white/80">{character.charClass ? `Level ${character.level} ${character.charClass}` : `Level ${character.level}`}</p>
                        <p className="mt-1 text-sm text-white/60">{ancestryLine}</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <Link
                            href="/characters"
                            className="rounded-xl border border-white/30 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10 hover:border-white/50"
                        >
                            ← Roster
                        </Link>
                        <Link
                            href={`/characters/${character.id}/items`}
                            className="rounded-xl border border-sky-400/40 bg-sky-400/10 px-5 py-2.5 text-sm font-semibold text-sky-200 transition hover:bg-sky-400/20"
                        >
                            🎒 Inventory
                        </Link>
                        <Link
                            href={`/characters/${character.id}/spells`}
                            className="rounded-xl border border-blue-400/40 bg-blue-400/10 px-5 py-2.5 text-sm font-semibold text-blue-300 transition hover:bg-blue-400/20"
                        >
                            📚 Spells
                        </Link>
                        <Link
                            href={`/characters/${character.id}/level-up`}
                            className="rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-5 py-2.5 text-sm font-bold text-emerald-300 transition hover:bg-emerald-400/20"
                        >
                            ⬆️ Level Up
                        </Link>
                        <Link
                            href={`/api/characters/${character.id}/sheet`}
                            prefetch={false}
                            className="rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 px-6 py-2.5 text-sm font-bold text-white shadow-lg transition hover:shadow-rose-400/40 hover:scale-[1.02]"
                        >
                            📄 Export PDF
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
                                                icon: "🛡️",
                                            },
                                            {
                                                label: "Initiative",
                                                value: formatModifier(abilityModifiers.dex),
                                                detail: "Dexterity modifier",
                                                icon: "⚡",
                                            },
                                            {
                                                label: "Speed",
                                                value: `${walkingSpeed} ft`,
                                                detail: "Walking speed",
                                                icon: "🏃",
                                            },
                                            {
                                                label: "Proficiency",
                                                value: `+${proficiencyBonus}`,
                                                detail: `Level ${character.level}`,
                                                icon: "⭐",
                                            },
                                            {
                                                label: "Hit Dice",
                                                value: hitDiceDisplay,
                                                detail: character.charClass || "Default d8",
                                                icon: "🎲",
                                            },
                                            {
                                                label: "Max HP",
                                                value: maxHpEstimate,
                                                detail: `Full die + avg rolls + CON mod`,
                                                icon: "❤️",
                                            },
                                        ].map((stat) => (
                                            <div key={stat.label} className="rounded-2xl border border-white/15 bg-gradient-to-br from-black/40 to-black/20 p-4">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="text-lg">{stat.icon}</span>
                                                    <p className="text-[0.65rem] font-bold uppercase tracking-wider text-white/60">{stat.label}</p>
                                                </div>
                                                <p className="text-3xl font-bold text-white">{stat.value}</p>
                                                <p className="mt-1.5 text-xs text-white/60">{stat.detail}</p>
                                            </div>
                                        ))}
                                    </div>

                                    <div>
                                        <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-white/60">Skill Checks</h2>
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            {skillSummaries.map((skill) => (
                                                <div
                                                    key={skill.key}
                                                    className={`rounded-xl border px-4 py-3 transition ${skill.proficient
                                                        ? "border-rose-400/60 bg-rose-400/15 shadow-lg shadow-rose-500/10"
                                                        : "border-white/15 bg-gradient-to-br from-black/40 to-black/20"
                                                        }`}
                                                >
                                                    <div className="flex items-center justify-between text-[0.65rem] font-bold uppercase tracking-wider mb-2">
                                                        <span className={skill.proficient ? "text-rose-300" : "text-white/60"}>{skill.label}</span>
                                                        <span className="text-white/50">{skill.ability.toUpperCase()}</span>
                                                    </div>
                                                    <div className="flex items-baseline justify-between gap-3">
                                                        <span className="text-2xl font-bold text-white">{formatModifier(skill.total)}</span>
                                                        <span className="text-xs text-white/70">
                                                            {skill.proficient ? `✓ +${proficiencyBonus}` : `${formatModifier(skill.base)}`}
                                                        </span>
                                                    </div>
                                                </div>
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

                    </aside>
                </section>

                <section className="rounded-2xl border border-white/15 bg-gradient-to-br from-white/10 to-white/5 p-6 backdrop-blur-sm">
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                        <div>
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                🎒 Inventory Preview
                            </h2>
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
                                Open inventory →
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
                    {inventoryItems.length === 0 ? (
                        <div className="mt-6 rounded-xl border border-dashed border-white/20 bg-black/20 p-6 text-center">
                            <p className="text-white/60">No inventory entries yet.</p>
                            <Link
                                href={`/characters/${character.id}/items`}
                                className="mt-3 inline-block text-sm font-semibold text-sky-300 hover:text-sky-100 transition"
                            >
                                Start packing →
                            </Link>
                        </div>
                    ) : (
                        <div className="mt-6 grid gap-4 sm:grid-cols-2">
                            {inventoryItems.map((item) => (
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
                                        <span className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1">{item.isCustom ? "Custom" : "SRD"}</span>
                                    </div>
                                    {item.notes && <p className="mt-3 text-sm text-white/70">{item.notes}</p>}
                                    <p className="mt-3 text-[0.65rem] uppercase tracking-[0.3em] text-white/50">Updated {item.updatedAt.toLocaleDateString()}</p>
                                </article>
                            ))}
                        </div>
                    )}
                </section>

                <section className="rounded-2xl border border-white/15 bg-gradient-to-br from-white/10 to-white/5 p-6 backdrop-blur-sm">
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                        <div>
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                📖 Spellbook
                            </h2>
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
                                Manage →
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
                                Add your first spell →
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
            </main>
        </div>
    );
}

