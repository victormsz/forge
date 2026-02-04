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
                        {requirement.features.length > 0 && (
                            <div className="mt-4 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4">
                                <h2 className="mb-2 text-sm font-semibold text-emerald-200">New Features at Level {nextLevel}</h2>
                                <ul className="space-y-1">
                                    {requirement.features.map((feature) => (
                                        <li key={feature.index} className="text-sm text-emerald-100/90">
                                            • {feature.name}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {requirement.spellcasting && (
                            <div className="mt-4 rounded-2xl border border-blue-400/30 bg-blue-500/10 p-4">
                                <h2 className="mb-3 text-sm font-semibold text-blue-200">Spellcasting at Level {nextLevel}</h2>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    {requirement.spellcasting.cantrips_known !== undefined && (
                                        <div className="rounded-xl border border-blue-400/20 bg-black/20 p-3">
                                            <dt className="text-xs uppercase tracking-wider text-blue-200/70">Cantrips Known</dt>
                                            <dd className="mt-1 text-lg font-semibold text-blue-100">{requirement.spellcasting.cantrips_known}</dd>
                                        </div>
                                    )}
                                    {requirement.spellcasting.spells_known !== undefined && (
                                        <div className="rounded-xl border border-blue-400/20 bg-black/20 p-3">
                                            <dt className="text-xs uppercase tracking-wider text-blue-200/70">Spells Known</dt>
                                            <dd className="mt-1 text-lg font-semibold text-blue-100">{requirement.spellcasting.spells_known}</dd>
                                        </div>
                                    )}
                                </div>
                                <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((level) => {
                                        const slots = requirement.spellcasting?.[`spell_slots_level_${level}` as keyof typeof requirement.spellcasting];
                                        if (slots === undefined || slots === 0) return null;
                                        return (
                                            <div key={level} className="rounded-lg border border-blue-400/20 bg-black/20 px-2 py-1.5 text-center">
                                                <dt className="text-[10px] uppercase tracking-wider text-blue-200/60">Lvl {level}</dt>
                                                <dd className="text-sm font-semibold text-blue-100">{slots}</dd>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                        {requirement.classSpecific && Object.keys(requirement.classSpecific).length > 0 && (
                            <div className="mt-4 rounded-2xl border border-purple-400/30 bg-purple-500/10 p-4">
                                <h2 className="mb-3 text-sm font-semibold text-purple-200">Class Resources at Level {nextLevel}</h2>
                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                    {Object.entries(requirement.classSpecific)
                                        .filter(([key]) => {
                                            // Filter out complex nested arrays that are better shown elsewhere
                                            return !key.includes("creating_spell_slots");
                                        })
                                        .map(([key, value]) => {
                                            // Format the key into a readable label
                                            const label = key
                                                .split("_")
                                                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                                                .join(" ");

                                            // Special formatting for certain values
                                            let displayValue: string;

                                            if (key === "rage_count" && value === 9999) {
                                                displayValue = "Unlimited";
                                            } else if (typeof value === "boolean") {
                                                displayValue = value ? "Yes" : "No";
                                            } else if (typeof value === "number" && value % 1 !== 0) {
                                                displayValue = `CR ${value}`;
                                            } else if (typeof value === "object" && value !== null) {
                                                // Handle nested objects like sneak_attack
                                                if ("dice_count" in value && "dice_value" in value) {
                                                    displayValue = `${value.dice_count}d${value.dice_value}`;
                                                } else {
                                                    displayValue = JSON.stringify(value);
                                                }
                                            } else {
                                                displayValue = String(value);
                                            }

                                            return (
                                                <div key={key} className="rounded-xl border border-purple-400/20 bg-black/20 p-3">
                                                    <dt className="text-xs uppercase tracking-wider text-purple-200/70">{label}</dt>
                                                    <dd className="mt-1 text-lg font-semibold text-purple-100">{displayValue}</dd>
                                                </div>
                                            );
                                        })}
                                </div>
                            </div>
                        )}
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
