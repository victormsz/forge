"use client";

import { useState } from "react";
import Link from "next/link";

import { HitDiceRoller } from "@/components/characters/hit-dice-roller";
import { SubclassSelector } from "@/components/characters/subclass-selector";
import { levelUpCharacter } from "@/app/characters/actions";
import { ABILITY_SCORE_PICKLIST, GLOBAL_FEAT_OPTIONS, SUBCLASS_DESCRIPTIONS } from "@/lib/characters/level-up-options";
import { HIT_DICE_ROLL_REQUIRED_MESSAGE } from "@/lib/characters/form-parsers";
import { getFeatDescription, featGrantsAbilityBonus } from "@/lib/characters/feats";
import type { SelectOption } from "@/lib/characters/level-up-options";

interface LevelUpFormProps {
    characterId: string;
    showHitDiceError: boolean;
    showSubclassChoice: boolean;
    showFeatChoice: boolean;
    abilitySlots: number;
    nextLevel: number;
    hitDieValue: number;
    conModifier: number;
    characterName: string;
    subclassOptions: SelectOption[];
}

export function LevelUpForm({
    characterId,
    showHitDiceError,
    showSubclassChoice,
    showFeatChoice,
    abilitySlots,
    nextLevel,
    hitDieValue,
    conModifier,
    characterName,
    subclassOptions,
}: LevelUpFormProps) {
    const [selectedFeat, setSelectedFeat] = useState<string>("");
    const [hoveredFeat, setHoveredFeat] = useState<string>("");

    const isFeatSelected = selectedFeat !== "";
    const showAbilityScoreImprovements = !isFeatSelected && abilitySlots > 0;

    return (
        <form action={levelUpCharacter} className="space-y-6">
            {showHitDiceError && (
                <div
                    role="alert"
                    className="rounded-2xl border border-rose-400/50 bg-rose-500/10 px-4 py-3 text-sm text-rose-100"
                >
                    {HIT_DICE_ROLL_REQUIRED_MESSAGE}
                </div>
            )}
            <input type="hidden" name="characterId" value={characterId} />

            {showSubclassChoice && (
                <SubclassSelector
                    subclassOptions={subclassOptions}
                    subclassDescriptions={SUBCLASS_DESCRIPTIONS}
                />
            )}

            {showFeatChoice && (
                <div className="space-y-3">
                    <label htmlFor="feat" className="text-sm font-semibold">
                        Feat (optional)
                    </label>

                    {/* Feat Options as Cards */}
                    <div className="grid gap-3 sm:grid-cols-2">
                        {/* Ability Score Improvement Option */}
                        <div
                            className={`cursor-pointer rounded-2xl border p-4 transition-all ${selectedFeat === ""
                                ? "border-rose-400 bg-rose-500/20 shadow-lg"
                                : "border-white/15 bg-black/30 hover:border-white/30"
                                }`}
                            onClick={() => setSelectedFeat("")}
                        >
                            <div className="flex items-center gap-2">
                                <input
                                    type="radio"
                                    name="feat"
                                    value=""
                                    checked={selectedFeat === ""}
                                    onChange={() => setSelectedFeat("")}
                                    className="h-4 w-4"
                                />
                                <span className="font-medium text-sm">Ability Score Improvement</span>
                            </div>
                            <p className="mt-1 text-xs text-white/60">
                                Use ability score improvements instead
                            </p>
                        </div>

                        {/* Feat Options with Hover */}
                        {GLOBAL_FEAT_OPTIONS.map((feat) => {
                            const isSelected = selectedFeat === feat.value;
                            const isHovered = hoveredFeat === feat.value;
                            const description = getFeatDescription(feat.value);
                            const hasAbilityBonus = featGrantsAbilityBonus(feat.value);

                            return (
                                <div
                                    key={feat.value}
                                    className={`cursor-pointer rounded-2xl border p-4 transition-all ${isSelected
                                        ? "border-rose-400 bg-rose-500/20 shadow-lg"
                                        : "border-white/15 bg-black/30 hover:border-white/30"
                                        }`}
                                    onClick={() => setSelectedFeat(feat.value)}
                                    onMouseEnter={() => setHoveredFeat(feat.value)}
                                    onMouseLeave={() => setHoveredFeat("")}
                                >
                                    <div className="flex items-start gap-2">
                                        <input
                                            type="radio"
                                            name="feat"
                                            value={feat.value}
                                            checked={isSelected}
                                            onChange={() => setSelectedFeat(feat.value)}
                                            className="mt-0.5 h-4 w-4"
                                        />
                                        <div className="flex-1">
                                            <div className="font-medium text-sm">{feat.label}</div>
                                            {feat.helper && (
                                                <p className="mt-0.5 text-xs text-white/60">{feat.helper}</p>
                                            )}
                                            {hasAbilityBonus && (
                                                <p className="mt-1 text-xs text-amber-300">
                                                    Grants +1 to an ability score
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Expanded description on hover */}
                                    {isHovered && description && (
                                        <div className="mt-3 border-t border-white/10 pt-3">
                                            <div className="whitespace-pre-line text-xs text-white/80">
                                                {description}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <p className="text-xs text-white/60">
                        {isFeatSelected
                            ? "Feat selected. Ability score improvements are hidden because you can only choose one option."
                            : "Choose a feat or use ability score improvements below."}
                    </p>
                </div>
            )}

            {/* Ability Score Improvements - Hidden when feat is selected */}
            {showAbilityScoreImprovements ? (
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
            ) : !isFeatSelected && abilitySlots === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/20 bg-black/20 px-4 py-3 text-sm text-white/60">
                    No ability score improvements unlock at level {nextLevel}. You can still document spell swaps or other features in the notes.
                </div>
            ) : null}

            {/* Hit Dice Section */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">Hit dice & HP gain</span>
                    <span className="text-xs text-white/60">Manual roll required</span>
                </div>
                <HitDiceRoller
                    hitDieValue={hitDieValue}
                    conModifier={conModifier}
                    nextLevel={nextLevel}
                    characterName={characterName}
                />
            </div>

            {/* Notes Section */}
            <div className="space-y-2">
                <label htmlFor="notes" className="text-sm font-semibold">
                    Notes
                </label>
                <textarea
                    id="notes"
                    name="notes"
                    rows={4}
                    placeholder="Document spell swaps, extra attacks, or custom table rulings."
                    className="w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-white focus:border-rose-300 focus:outline-none"
                />
            </div>

            {/* Action Buttons */}
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
    );
}
