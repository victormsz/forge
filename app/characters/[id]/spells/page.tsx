import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import type { SpellTargetAffinity, SpellTargetShape } from "@prisma/client";

import { addSpell, deleteSpell, toggleSpellPreparation } from "@/app/characters/actions";
import { Card } from "@/components/ui/card";
import { SpellLibraryForm } from "@/components/spells/spell-library-form";
import { getCurrentActor } from "@/lib/current-actor";
import { prisma } from "@/lib/prisma";
import { SPELL_AFFINITY_LABELS, SPELL_SHAPE_LABELS } from "@/lib/spells/labels";
import { getReferenceSpells, spellSupportsClass } from "@/lib/spells/reference";
import { getSpellPreparationProfile } from "@/lib/spells/class-preparation";
import { getSpellSlotSummary } from "@/lib/spells/slot-profiles";

export const metadata: Metadata = {
    title: "ForgeSheet | Spell Manager",
    description: "Attach SRD spells or custom templates to your character with targeting metadata.",
};

const referenceSpells = getReferenceSpells();
const shapeOptions = (Object.entries(SPELL_SHAPE_LABELS) as [SpellTargetShape, string][]).map(([value, label]) => ({ value, label }));
const affinityOptions = (Object.entries(SPELL_AFFINITY_LABELS) as [SpellTargetAffinity, string][]).map(([value, label]) => ({ value, label }));

interface CharacterSpellsPageProps {
    params: Promise<{ id: string }>;
}

const SLOT_ORDINALS = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th"] as const;

function formatSpellLevelLabel(level: number) {
    return SLOT_ORDINALS[level - 1] ?? `${level}th`;
}

export default async function CharacterSpellsPage({ params }: CharacterSpellsPageProps) {
    const { id } = await params;
    const actor = await getCurrentActor();

    if (!actor) {
        redirect("/");
    }

    const character = await prisma.character.findFirst({
        where: { id, userId: actor.userId },
        select: {
            id: true,
            name: true,
            level: true,
            charClass: true,
            spells: {
                orderBy: [
                    { level: "asc" },
                    { name: "asc" },
                ],
                select: {
                    id: true,
                    name: true,
                    level: true,
                    shape: true,
                    affinity: true,
                    range: true,
                    school: true,
                    damage: true,
                    description: true,
                    isCustom: true,
                    isPrepared: true,
                    updatedAt: true,
                },
            },
        },
    });

    if (!character) {
        notFound();
    }

    const slotSummary = getSpellSlotSummary(character.charClass, character.level);
    const maxSpellLevel = slotSummary.maxSpellLevel;
    const classFilteredReferences = character.charClass
        ? referenceSpells.filter((spell) => spellSupportsClass(spell, character.charClass))
        : referenceSpells;
    const cappedReferences = classFilteredReferences.filter((spell) => spell.level <= maxSpellLevel);

    const prepProfile = getSpellPreparationProfile(character.charClass);
    const canTogglePreparation = prepProfile.mode === "PREPARES_DAILY";
    const preparedSpells = canTogglePreparation
        ? character.spells.filter((spell) => spell.isPrepared)
        : character.spells;
    const knownSpells = character.spells;
    const hasSlotResources = slotSummary.slots.length > 0 || Boolean(slotSummary.pact && slotSummary.pact.slots > 0);

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(250,232,214,0.18),_transparent_60%),_#040307] text-white">
            <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-16 sm:px-6 lg:px-8">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-rose-200">Spell management</p>
                        <h1 className="text-3xl font-semibold text-white sm:text-4xl">{character.name}</h1>
                        <p className="text-sm text-white/70">
                            {character.charClass ? `Level ${character.level} ${character.charClass}` : `Level ${character.level}`}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <Link
                            href={`/characters/${character.id}`}
                            className="rounded-full border border-white/20 px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:border-rose-200"
                        >
                            Back to sheet
                        </Link>
                        <Link
                            href="/characters"
                            className="rounded-full border border-white/20 px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:border-rose-200"
                        >
                            Back to roster
                        </Link>
                    </div>
                </div>

                <section className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                    <div className="space-y-8">
                        <Card className="rounded-3xl border border-white/10 bg-white/5 p-6">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <div className="flex items-center gap-2 text-[0.65rem] uppercase tracking-[0.35em] text-white/60">
                                        <span>{slotSummary.title}</span>
                                    </div>
                                    <h2 className="text-lg font-semibold text-white">Spell slots</h2>
                                    <p className="text-sm text-white/70">{slotSummary.description}</p>
                                    {slotSummary.note && <p className="mt-2 text-xs text-white/60">{slotSummary.note}</p>}
                                </div>
                                <span className="text-xs uppercase tracking-[0.3em] text-white/60">Level {character.level}</span>
                            </div>

                            {hasSlotResources ? (
                                <div className="mt-6 space-y-4">
                                    {slotSummary.pact && (
                                        <div className="rounded-2xl border border-emerald-400/40 bg-emerald-400/10 p-4 text-sm text-white">
                                            <p className="text-xs uppercase tracking-[0.3em] text-emerald-200">Pact slots</p>
                                            <p className="mt-1 text-lg font-semibold text-white">
                                                {slotSummary.pact.slots} × {formatSpellLevelLabel(slotSummary.pact.slotLevel)}-level
                                            </p>
                                            <p className="text-xs text-white/70">Refresh on a short rest.</p>
                                        </div>
                                    )}
                                    {slotSummary.slots.length > 0 && (
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            {slotSummary.slots.map((entry) => (
                                                <div key={entry.spellLevel} className="rounded-2xl border border-white/10 bg-black/30 p-4">
                                                    <p className="text-xs uppercase tracking-[0.35em] text-white/60">{formatSpellLevelLabel(entry.spellLevel)} level</p>
                                                    <p className="mt-2 text-2xl font-semibold text-white">{entry.slots}</p>
                                                    <p className="text-xs text-white/60">Slots available</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <p className="mt-6 rounded-2xl border border-dashed border-white/12 bg-black/30 p-6 text-sm text-white/60">{slotSummary.emptyState}</p>
                            )}
                        </Card>

                        <Card className="rounded-3xl border border-white/10 bg-white/5 p-6">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <h2 className="text-lg font-semibold text-white">Prepared spells</h2>
                                    <p className="text-sm text-white/70">
                                        {canTogglePreparation
                                            ? "Mark the spells you are ready to cast this adventuring day."
                                            : "This class treats every known spell as always available."}
                                    </p>
                                </div>
                                <span className="text-xs uppercase tracking-[0.3em] text-white/60">{preparedSpells.length} ready</span>
                            </div>

                            {preparedSpells.length === 0 ? (
                                <p className="mt-6 rounded-2xl border border-dashed border-white/12 bg-black/30 p-6 text-sm text-white/60">
                                    {canTogglePreparation
                                        ? "No spells are prepared. Use the Prepare buttons in your known spell list to stage combat options."
                                        : "Add spells on the right to populate your automatic prepared list."}
                                </p>
                            ) : (
                                <div className="mt-6 space-y-4">
                                    {preparedSpells.map((spell) => (
                                        <Card key={`prepared-${spell.id}`} className="rounded-2xl border border-white/10 bg-black/30 p-4">
                                            <div className="flex flex-wrap items-center justify-between gap-3">
                                                <div>
                                                    <p className="text-xs uppercase tracking-[0.35em] text-white/50">Level {spell.level}</p>
                                                    <h3 className="text-xl font-semibold text-white">{spell.name}</h3>
                                                </div>
                                                {canTogglePreparation && (
                                                    <form action={toggleSpellPreparation}>
                                                        <input type="hidden" name="spellId" value={spell.id} />
                                                        <input type="hidden" name="characterId" value={character.id} />
                                                        <input type="hidden" name="isPrepared" value="false" />
                                                        <button
                                                            type="submit"
                                                            className="rounded-full border border-white/25 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-white/80 transition hover:border-amber-300 hover:text-amber-200"
                                                        >
                                                            Unprepare
                                                        </button>
                                                    </form>
                                                )}
                                            </div>
                                            <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/70">
                                                <span className="rounded-full border border-white/10 px-3 py-1">{SPELL_SHAPE_LABELS[spell.shape]}</span>
                                                <span className="rounded-full border border-white/10 px-3 py-1">{SPELL_AFFINITY_LABELS[spell.affinity]}</span>
                                                <span className="rounded-full border border-white/10 px-3 py-1">Range: {spell.range ?? "Self"}</span>
                                                {spell.school && <span className="rounded-full border border-white/10 px-3 py-1">{spell.school}</span>}
                                                {spell.damage && <span className="rounded-full border border-white/10 px-3 py-1">{spell.damage}</span>}
                                            </div>
                                            {spell.description && <p className="mt-3 text-sm text-white/70">{spell.description}</p>}
                                            <p className="mt-3 text-xs uppercase tracking-[0.3em] text-white/50">
                                                {spell.isCustom ? "Custom entry" : "SRD reference"} · Updated {spell.updatedAt.toLocaleDateString()}
                                            </p>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </Card>

                        <Card className="rounded-3xl border border-white/10 bg-white/5 p-6">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <h2 className="text-lg font-semibold text-white">Known spells</h2>
                                    <p className="text-sm text-white/70">{prepProfile.rule}</p>
                                    {prepProfile.tashaNote && <p className="mt-2 text-xs text-white/60">Tasha&#39;s: {prepProfile.tashaNote}</p>}
                                </div>
                                <span className="text-xs uppercase tracking-[0.3em] text-white/60">{knownSpells.length} cataloged</span>
                            </div>

                            {knownSpells.length === 0 ? (
                                <p className="mt-6 rounded-2xl border border-dashed border-white/12 bg-black/30 p-6 text-sm text-white/60">
                                    No spells yet. Use the library on the right to attach cantrips, rituals, and custom area effects.
                                </p>
                            ) : (
                                <div className="mt-6 space-y-4">
                                    {knownSpells.map((spell) => (
                                        <Card key={spell.id} className="rounded-2xl border border-white/10 bg-black/30 p-4">
                                            <div className="flex flex-wrap items-center justify-between gap-3">
                                                <div>
                                                    <p className="text-xs uppercase tracking-[0.35em] text-white/50">Level {spell.level}</p>
                                                    <h3 className="text-xl font-semibold text-white">{spell.name}</h3>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    {canTogglePreparation && !spell.isPrepared && (
                                                        <form action={toggleSpellPreparation}>
                                                            <input type="hidden" name="spellId" value={spell.id} />
                                                            <input type="hidden" name="characterId" value={character.id} />
                                                            <input type="hidden" name="isPrepared" value="true" />
                                                            <button
                                                                type="submit"
                                                                className="rounded-full border border-emerald-400/50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-200 transition hover:bg-emerald-400/10"
                                                            >
                                                                Prepare
                                                            </button>
                                                        </form>
                                                    )}
                                                    {(!canTogglePreparation || spell.isPrepared) && (
                                                        <span className="rounded-full border border-white/15 px-3 py-1 text-xs uppercase tracking-[0.3em] text-white/60">
                                                            {spell.isPrepared ? "Prepared" : "Always ready"}
                                                        </span>
                                                    )}
                                                    <form action={deleteSpell}>
                                                        <input type="hidden" name="spellId" value={spell.id} />
                                                        <input type="hidden" name="characterId" value={character.id} />
                                                        <button
                                                            type="submit"
                                                            className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-white/80 transition hover:border-rose-300 hover:text-white"
                                                        >
                                                            Delete
                                                        </button>
                                                    </form>
                                                </div>
                                            </div>
                                            <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/70">
                                                <span className="rounded-full border border-white/10 px-3 py-1">{SPELL_SHAPE_LABELS[spell.shape]}</span>
                                                <span className="rounded-full border border-white/10 px-3 py-1">{SPELL_AFFINITY_LABELS[spell.affinity]}</span>
                                                <span className="rounded-full border border-white/10 px-3 py-1">Range: {spell.range ?? "Self"}</span>
                                                {spell.school && <span className="rounded-full border border-white/10 px-3 py-1">{spell.school}</span>}
                                                {spell.damage && <span className="rounded-full border border-white/10 px-3 py-1">{spell.damage}</span>}
                                            </div>
                                            {spell.description && <p className="mt-3 text-sm text-white/70">{spell.description}</p>}
                                            <p className="mt-3 text-xs uppercase tracking-[0.3em] text-white/50">
                                                {spell.isCustom ? "Custom entry" : "SRD reference"} · Updated {spell.updatedAt.toLocaleDateString()}
                                            </p>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </Card>
                    </div>

                    <SpellLibraryForm
                        characterId={character.id}
                        characterClass={character.charClass}
                        references={cappedReferences}
                        maxSpellLevel={maxSpellLevel}
                        shapeOptions={shapeOptions}
                        affinityOptions={affinityOptions}
                        action={addSpell}
                    />
                </section>
            </main>
        </div>
    );
}
