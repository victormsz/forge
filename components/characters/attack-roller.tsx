"use client";

import { useMemo, useState } from "react";

type AdvantageState = "normal" | "advantage" | "disadvantage";

function rollDie(sides: number) {
    return Math.floor(Math.random() * sides) + 1;
}

function rollWithAdvantageOrDisadvantage(dieSides: number, mode: AdvantageState) {
    const first = rollDie(dieSides);
    if (mode === "normal") {
        return { total: first, rolls: [first] };
    }
    const second = rollDie(dieSides);
    const selected = mode === "advantage" ? Math.max(first, second) : Math.min(first, second);
    return { total: selected, rolls: [first, second] };
}

interface AttackRollerProps {
    attackBonus: number;
    damage: string | null;
    weaponName: string;
    proficiencyApplied: boolean;
    defaultDieSides?: number;
    unarmedFallbackDamage: string;
}

export function AttackRoller({
    attackBonus,
    damage,
    weaponName,
    proficiencyApplied,
    defaultDieSides = 20,
    unarmedFallbackDamage,
}: AttackRollerProps) {
    const [advantageState, setAdvantageState] = useState<AdvantageState>("normal");
    const [customDieSides, setCustomDieSides] = useState<string>("");
    const [result, setResult] = useState<{ total: number; rolls: number[] } | null>(null);

    const dieSides = useMemo(() => {
        const parsed = Number(customDieSides);
        if (Number.isFinite(parsed) && parsed >= 2) {
            return Math.floor(parsed);
        }
        return defaultDieSides;
    }, [customDieSides, defaultDieSides]);

    const handleRoll = () => {
        const rolled = rollWithAdvantageOrDisadvantage(dieSides, advantageState);
        setResult(rolled);
    };

    const advantageLabel =
        advantageState === "advantage" ? "Advantage" : advantageState === "disadvantage" ? "Disadvantage" : "Normal";

    const displayDamage = damage ?? unarmedFallbackDamage;
    const rollBreakdown =
        result && result.rolls.length === 2 ? `(${result.rolls.join(" vs ")})` : result?.rolls?.[0]?.toString() ?? "";

    return (
        <div className="rounded-2xl border border-white/15 bg-gradient-to-br from-black/40 to-black/20 p-4">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-xs uppercase tracking-[0.35em] text-white/50">Attack</p>
                    <h3 className="text-lg font-bold text-white">{weaponName || "Unarmed Strike"}</h3>
                    <p className="text-xs text-white/60">
                        Attack bonus {attackBonus >= 0 ? `+${attackBonus}` : attackBonus} · Damage {displayDamage}{" "}
                        {proficiencyApplied ? "(Proficient)" : "(Not proficient)"}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <label className="text-xs text-white/60">
                        Die (d?)
                        <input
                            value={customDieSides}
                            onChange={(event) => setCustomDieSides(event.target.value)}
                            placeholder={`${defaultDieSides}`}
                            className="ml-2 w-16 rounded-lg border border-white/20 bg-black/40 px-2 py-1 text-xs text-white placeholder:text-white/40"
                            inputMode="numeric"
                            pattern="\d*"
                        />
                    </label>
                    <div className="flex items-center gap-2 text-[0.65rem] text-white/70">
                        <label className="flex items-center gap-1">
                            <input
                                type="checkbox"
                                checked={advantageState === "advantage"}
                                onChange={(event) => setAdvantageState(event.target.checked ? "advantage" : "normal")}
                                className="h-3 w-3 accent-emerald-400"
                            />
                            Advantage
                        </label>
                        <label className="flex items-center gap-1">
                            <input
                                type="checkbox"
                                checked={advantageState === "disadvantage"}
                                onChange={(event) =>
                                    setAdvantageState(event.target.checked ? "disadvantage" : "normal")
                                }
                                className="h-3 w-3 accent-rose-400"
                            />
                            Disadvantage
                        </label>
                    </div>
                </div>
            </div>

            <div className="mt-3 flex items-center justify-between gap-3">
                <button
                    type="button"
                    onClick={handleRoll}
                    className="rounded-full border border-rose-300/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-rose-200 transition hover:bg-rose-400/10"
                >
                    Roll d{dieSides} ({advantageLabel})
                </button>
                {result && (
                    <div className="text-sm text-white/70">
                        <p className="font-semibold text-white">
                            Attack roll: {result.total + attackBonus} (roll {rollBreakdown} {attackBonus >= 0 ? `+${attackBonus}` : attackBonus})
                        </p>
                        {result.rolls.length === 2 && <p className="text-xs text-white/60">Two dice: {result.rolls.join(" / ")}</p>}
                    </div>
                )}
            </div>
        </div>
    );
}
