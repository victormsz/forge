"use client";

import { useState } from "react";
import { SPELL_AFFINITY_LABELS, SPELL_SHAPE_LABELS } from "@/lib/spells/labels";
import type { SpellTargetAffinity, SpellTargetShape } from "@prisma/client";

export type SpellRollerSpell = {
    id: string;
    name: string;
    school: string | null;
    affinity: string;
    shape: string;
    range: string | null;
    damage: string | null;
    description: string | null;
    isPrepared: boolean;
};

export interface SpellRollerProps {
    spell: SpellRollerSpell;
    spellSaveDC?: number;
    spellAttackBonus?: number;
}

interface DiceExpression {
    count: number;
    sides: number;
    bonus: number;
    label: string;
}

function parseDiceExpression(raw: string): DiceExpression | null {
    const match = raw.match(/(\d+)d(\d+)([+-]\d+)?/i);
    if (!match) return null;
    const count = parseInt(match[1], 10);
    const sides = parseInt(match[2], 10);
    const bonus = match[3] ? parseInt(match[3], 10) : 0;
    const label = `${count}d${sides}${bonus !== 0 ? (bonus > 0 ? `+${bonus}` : bonus) : ""}`;
    return { count, sides, bonus, label };
}

function rollDie(sides: number) {
    return Math.floor(Math.random() * sides) + 1;
}

interface DiceRollResult {
    rolls: number[];
    bonus: number;
    total: number;
}

interface AttackRollResult {
    roll: number;
    total: number;
}

export function SpellRoller({ spell, spellSaveDC, spellAttackBonus }: SpellRollerProps) {
    const [damageResult, setDamageResult] = useState<DiceRollResult | null>(null);
    const [attackResult, setAttackResult] = useState<AttackRollResult | null>(null);
    const [showDescription, setShowDescription] = useState(false);

    const diceExpr = spell.damage ? parseDiceExpression(spell.damage) : null;

    function handleDamageRoll() {
        if (!diceExpr) return;
        const rolls = Array.from({ length: diceExpr.count }, () => rollDie(diceExpr.sides));
        const total = rolls.reduce((sum, r) => sum + r, 0) + diceExpr.bonus;
        setDamageResult({ rolls, bonus: diceExpr.bonus, total });
    }

    function handleAttackRoll() {
        const roll = rollDie(20);
        setAttackResult({ roll, total: roll + (spellAttackBonus ?? 0) });
    }

    const affinityLabel = SPELL_AFFINITY_LABELS[spell.affinity as SpellTargetAffinity];
    const shapeLabel = spell.shape !== "SINGLE" ? SPELL_SHAPE_LABELS[spell.shape as SpellTargetShape] : null;
    const meta = [affinityLabel, shapeLabel, spell.range, spell.school].filter(Boolean).join(" · ");

    const bonusStr = (spellAttackBonus ?? 0) >= 0 ? `+${spellAttackBonus ?? 0}` : `${spellAttackBonus ?? 0}`;

    const isCrit = attackResult?.roll === 20;
    const isMiss = attackResult?.roll === 1;

    const damageBreakdown = damageResult
        ? [
            damageResult.rolls.join(" + "),
            damageResult.bonus !== 0
                ? `${damageResult.bonus > 0 ? "+" : ""}${damageResult.bonus}`
                : null,
        ].filter(Boolean).join(" ")
        : null;

    return (
        <li className="rounded-xl border border-white/10 bg-black/20 p-3 space-y-2.5">
            {/* ── Header: name + prepared badge + damage badge ── */}
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-white leading-tight">{spell.name}</p>
                        {spell.isPrepared && (
                            <span className="rounded-md border border-emerald-400/30 bg-emerald-400/10 px-1.5 py-0.5 text-[0.55rem] font-semibold uppercase tracking-wider text-emerald-300">
                                Prepared
                            </span>
                        )}
                    </div>
                    {meta && <p className="text-[0.65rem] text-white/50 mt-0.5">{meta}</p>}
                </div>
                {spell.damage && (
                    <span className="shrink-0 rounded-lg border border-rose-400/30 bg-rose-400/10 px-1.5 py-0.5 text-[0.6rem] font-semibold text-rose-300">
                        {spell.damage}
                    </span>
                )}
            </div>

            {/* ── Info chips: save DC + spell attack bonus ── */}
            {(spellSaveDC !== undefined || spellAttackBonus !== undefined) && (
                <div className="flex flex-wrap gap-1.5">
                    {spellSaveDC !== undefined && (
                        <span className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[0.6rem] font-semibold text-amber-200">
                            Save DC {spellSaveDC}
                        </span>
                    )}
                    {spellAttackBonus !== undefined && (
                        <span className="rounded-lg border border-sky-400/30 bg-sky-400/10 px-2 py-0.5 text-[0.6rem] font-semibold text-sky-200">
                            Spell Atk {bonusStr}
                        </span>
                    )}
                </div>
            )}

            {/* ── Roll buttons ── */}
            {(spellAttackBonus !== undefined || diceExpr) && (
                <div className="space-y-1.5">
                    {spellAttackBonus !== undefined && (
                        <div className="flex items-center gap-3 flex-wrap">
                            <button
                                type="button"
                                onClick={handleAttackRoll}
                                className="rounded-full border border-sky-300/50 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-sky-200 transition hover:bg-sky-400/10"
                            >
                                Spell Attack d20{bonusStr}
                            </button>
                            {attackResult && (
                                <p className="text-xs">
                                    <span className={`text-base font-bold ${isCrit ? "text-emerald-300" : isMiss ? "text-rose-400" : "text-white"}`}>
                                        {isCrit ? "Critical!" : isMiss ? "Miss!" : attackResult.total}
                                    </span>
                                    {" "}
                                    <span className="text-white/40">(roll {attackResult.roll} {bonusStr})</span>
                                </p>
                            )}
                        </div>
                    )}

                    {diceExpr && (
                        <div className="flex items-center gap-3 flex-wrap">
                            <button
                                type="button"
                                onClick={handleDamageRoll}
                                className="rounded-full border border-rose-300/50 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-rose-200 transition hover:bg-rose-400/10"
                            >
                                Roll Damage {diceExpr.label}
                            </button>
                            {damageResult && (
                                <p className="text-xs">
                                    <span className="text-base font-bold text-white">{damageResult.total}</span>
                                    {" "}
                                    <span className="text-white/40">({damageBreakdown})</span>
                                </p>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* ── Description toggle ── */}
            {spell.description && (
                <div>
                    <button
                        type="button"
                        onClick={() => setShowDescription((v) => !v)}
                        className="text-[0.6rem] font-semibold uppercase tracking-[0.25em] text-white/40 transition hover:text-white/70"
                    >
                        {showDescription ? "Hide" : "Show"} description
                    </button>
                    {showDescription && (
                        <p className="mt-1.5 text-[0.7rem] leading-relaxed text-white/60">
                            {spell.description}
                        </p>
                    )}
                </div>
            )}
        </li>
    );
}
