"use client";

import { useMemo, useState } from "react";

interface HitDiceRollerProps {
    hitDieValue: number;
    conModifier: number;
    nextLevel: number;
    characterName: string;
}

function rollDie(sides: number) {
    return Math.floor(Math.random() * sides) + 1;
}

export function HitDiceRoller({ hitDieValue, conModifier, nextLevel, characterName }: HitDiceRollerProps) {
    const [roll, setRoll] = useState<number | null>(null);
    const [rolling, setRolling] = useState(false);

    const totalGain = useMemo(() => {
        if (roll === null) {
            return null;
        }
        return Math.max(1, roll + conModifier);
    }, [roll, conModifier]);

    const handleRoll = () => {
        if (rolling) {
            return;
        }
        setRolling(true);
        setTimeout(() => {
            setRoll(rollDie(hitDieValue));
            setRolling(false);
        }, 200);
    };

    const handleReset = () => {
        setRoll(null);
    };

    const conCopy = conModifier >= 0 ? `+${conModifier}` : conModifier.toString();

    return (
        <div className="space-y-3 rounded-2xl border border-white/10 bg-black/30 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p className="text-xs uppercase tracking-[0.35em] text-white/50">Hit dice</p>
                    <p className="text-lg font-semibold text-white">Rolling 1d{hitDieValue} for {characterName}&rsquo;s level {nextLevel}</p>
                </div>
                <button
                    type="button"
                    onClick={handleRoll}
                    disabled={rolling || roll !== null}
                    className="rounded-full border border-emerald-300/60 px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-200 transition hover:bg-emerald-400/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {rolling ? "Rolling..." : roll !== null ? "Rolled" : `Roll d${hitDieValue}`}
                </button>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white/70">
                <p>Constitution modifier: <span className="font-semibold text-white">{conCopy}</span></p>
                {totalGain === null ? (
                    <p className="mt-1 text-xs text-white/60">Click the die to capture your HP gain for this level.</p>
                ) : (
                    <p className="mt-1 text-xs text-emerald-200">HP increase locked at {totalGain} (roll {roll} + CON {conCopy}).</p>
                )}
            </div>

            {roll !== null && (
                <button
                    type="button"
                    onClick={handleReset}
                    className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60 underline-offset-4 hover:text-white hover:underline"
                >
                    Reset roll
                </button>
            )}

            <input
                type="number"
                name="hitDiceRoll"
                value={roll ?? ""}
                readOnly
                required
                tabIndex={-1}
                aria-hidden="true"
                className="sr-only"
            />
        </div>
    );
}
