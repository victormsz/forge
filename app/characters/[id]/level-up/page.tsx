import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { HitDiceRoller } from "@/components/characters/hit-dice-roller";
import { levelUpCharacter } from "@/app/characters/actions";
import { ABILITY_SCORE_PICKLIST, GLOBAL_FEAT_OPTIONS, getSubclassOptions } from "@/lib/characters/level-up-options";
import { MAX_CHARACTER_LEVEL } from "@/lib/characters/constants";
import { getLevelRequirement } from "@/lib/characters/leveling/level-requirements";
import { getHitDieValue } from "@/lib/characters/hit-dice";
import { getCurrentActor } from "@/lib/current-actor";
import { prisma } from "@/lib/prisma";
import { HIT_DICE_ROLL_REQUIRED_MESSAGE } from "@/lib/characters/form-parsers";

interface LevelUpPageProps {
    params: { id: string };
    searchParams?: { error?: string };
}

export default async function LevelUpPage({ params, searchParams }: LevelUpPageProps) {
    const actor = await getCurrentActor();

    if (!actor) {
        redirect("/");
    }

    if (actor.isGuest) {
        redirect("/characters");
    }

    const character = await prisma.character.findFirst({
        where: { id: params.id, userId: actor.userId },
        select: {
            id: true,
            name: true,
            level: true,
            charClass: true,
            abilityScores: true,
        },
    });

    if (!character) {
        notFound();
    }

    const nextLevel = Math.min(MAX_CHARACTER_LEVEL, character.level + 1);

    if (nextLevel === character.level) {
        redirect("/characters");
    }

    const requirement = getLevelRequirement(character.charClass, nextLevel);
    const abilityScores = (character.abilityScores as Record<string, number>) ?? {};
    const abilityDisplay = ABILITY_SCORE_PICKLIST.map((entry) => ({
        ...entry,
        score: abilityScores[entry.value] ?? 0,
    }));
    const conScore = abilityScores.con ?? 10;
    const conModifier = Math.floor((conScore - 10) / 2);
    const hitDieValue = getHitDieValue(character.charClass);

    const subclassOptions = getSubclassOptions(character.charClass);
    const abilitySlots = requirement.abilityScoreIncrements;
    const showFeatChoice = requirement.allowFeatChoice;
    const showSubclassChoice = requirement.requiresSubclass;
    const showHitDiceError = searchParams?.error === "missing-hit-die";

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(250,232,214,0.15),_transparent_45%),_#050506] py-16 text-white">
            <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between text-sm text-white/70">
                    <Link href="/characters" className="text-white/70 transition hover:text-white">
                        ← Back to roster
                    </Link>
                    <p className="uppercase tracking-[0.3em] text-rose-200">Level Up</p>
                </div>

                <section className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
                    <header className="space-y-2">
                        <p className="text-xs uppercase tracking-[0.4em] text-white/60">{character.charClass ?? "Hero"}</p>
                        <h1 className="text-3xl font-semibold">Advance {character.name}</h1>
                        <p className="text-sm text-white/70">
                            You are moving from level {character.level} to level {nextLevel}. The form below highlights only the options that unlock for this class and level so every advancement stays rules-accurate.
                        </p>
                    </header>

                    <dl className="mt-6 grid gap-3 sm:grid-cols-3">
                        {abilityDisplay.map((ability) => (
                            <div key={ability.value} className="rounded-2xl border border-white/10 bg-black/30 p-4 text-center">
                                <dt className="text-xs uppercase tracking-[0.4em] text-white/50">{ability.label}</dt>
                                <dd className="text-2xl font-semibold text-white">{ability.score}</dd>
                            </div>
                        ))}
                    </dl>
                </section>

                <section className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
                    <form action={levelUpCharacter} className="space-y-6">
                        {showHitDiceError && (
                            <div
                                role="alert"
                                className="rounded-2xl border border-rose-400/50 bg-rose-500/10 px-4 py-3 text-sm text-rose-100"
                            >
                                {HIT_DICE_ROLL_REQUIRED_MESSAGE}
                            </div>
                        )}
                        <input type="hidden" name="characterId" value={character.id} />

                        {showSubclassChoice && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label htmlFor="subclass" className="text-sm font-semibold">Subclass</label>
                                    <span className="text-xs text-white/60">Required at this level</span>
                                </div>
                                {subclassOptions.length > 0 ? (
                                    <select
                                        id="subclass"
                                        name="subclass"
                                        defaultValue=""
                                        className="w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-white focus:border-rose-300 focus:outline-none"
                                    >
                                        <option value="">Select a subclass</option>
                                        {subclassOptions.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        id="subclass"
                                        name="subclass"
                                        type="text"
                                        placeholder="Enter the subclass name"
                                        className="w-full rounded-2xl border border-dashed border-white/30 bg-black/20 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-rose-300 focus:outline-none"
                                    />
                                )}
                            </div>
                        )}

                        {showFeatChoice && (
                            <div className="space-y-2">
                                <label htmlFor="feat" className="text-sm font-semibold">Feat (optional)</label>
                                <select
                                    id="feat"
                                    name="feat"
                                    defaultValue=""
                                    className="w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-white focus:border-rose-300 focus:outline-none"
                                >
                                    <option value="">Choose a feat</option>
                                    {GLOBAL_FEAT_OPTIONS.map((feat) => (
                                        <option key={feat.value} value={feat.value}>
                                            {feat.label}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-xs text-white/60">Spend this slot on a feat or split +2 ability points above.</p>
                            </div>
                        )}

                        {abilitySlots > 0 ? (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-semibold">Ability score improvements</span>
                                    <span className="text-xs text-white/60">Select {abilitySlots} × +1 bonuses</span>
                                </div>
                                <div className={`grid gap-3 ${abilitySlots > 1 ? "sm:grid-cols-2" : "sm:grid-cols-1"}`}>
                                    {Array.from({ length: abilitySlots }).map((_, index) => (
                                        <select
                                            key={index}
                                            name="abilityIncreases"
                                            defaultValue=""
                                            className="w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-white focus:border-rose-300 focus:outline-none"
                                        >
                                            <option value="">No change</option>
                                            {ABILITY_SCORE_PICKLIST.map((ability) => (
                                                <option key={ability.value} value={ability.value}>
                                                    {ability.label}
                                                </option>
                                            ))}
                                        </select>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="rounded-2xl border border-dashed border-white/20 bg-black/20 px-4 py-3 text-sm text-white/60">
                                No ability score improvements unlock at level {nextLevel}. You can still document spell swaps or other features in the notes.
                            </div>
                        )}

                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-semibold">Hit dice & HP gain</span>
                                <span className="text-xs text-white/60">Manual roll required</span>
                            </div>
                            <HitDiceRoller
                                hitDieValue={hitDieValue}
                                conModifier={conModifier}
                                nextLevel={nextLevel}
                                characterName={character.name}
                            />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="notes" className="text-sm font-semibold">Notes</label>
                            <textarea
                                id="notes"
                                name="notes"
                                rows={4}
                                placeholder="Document spell swaps, extra attacks, or custom table rulings."
                                className="w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-white focus:border-rose-300 focus:outline-none"
                            />
                        </div>

                        <div className="flex flex-wrap gap-4">
                            <Link
                                href="/characters"
                                className="rounded-full border border-white/20 px-6 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-white/70 transition hover:border-white/40"
                            >
                                Cancel
                            </Link>
                            <button
                                type="submit"
                                className="rounded-full bg-rose-400 px-6 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-black transition hover:bg-rose-300"
                            >
                                Apply level up
                            </button>
                        </div>
                    </form>
                </section>
            </main>
        </div>
    );
}
