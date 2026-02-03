import Link from "next/link";

import { deleteCharacter } from "@/app/characters/actions";

type AbilityScores = Record<string, number>;

type AbilityGenerationMethod = "POINT_BUY" | "RANDOM";

interface CharacterCardProps {
    character: {
        id: string;
        name: string;
        level: number;
        charClass: string | null;
        ancestry: string | null;
        background: string | null;
        alignment: string | null;
        generationMethod: AbilityGenerationMethod;
        abilityScores: AbilityScores;
        spellsCount: number;
        updatedAt: Date;
    };
}

const generationMethodCopy: Record<AbilityGenerationMethod, string> = {
    POINT_BUY: "Point Buy",
    RANDOM: "Random Rolls",
};

export function CharacterCard({ character }: CharacterCardProps) {
    const {
        id,
        name,
        level,
        charClass,
        ancestry,
        background,
        alignment,
        generationMethod,
        abilityScores,
        spellsCount,
        updatedAt,
    } = character;
    const subtitle = [
        charClass ? `Lvl ${level} ${charClass}` : `Level ${level}`,
        ancestry,
    ]
        .filter(Boolean)
        .join(" · ");

    return (
        <article className="group flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-4 text-white transition hover:-translate-y-1 hover:border-rose-300/60 hover:bg-white/10">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h3 className="text-lg font-semibold">{name}</h3>
                    <p className="text-xs uppercase tracking-[0.25em] text-white/60">{generationMethodCopy[generationMethod]}</p>
                    <p className="text-sm text-white/70">{subtitle || "Awaiting class + ancestry"}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-[0.65rem] uppercase tracking-[0.25em] text-white/60">
                        {background && (
                            <span className="rounded-full border border-white/15 px-2 py-1 text-white/70">{background}</span>
                        )}
                        {alignment && (
                            <span className="rounded-full border border-white/15 px-2 py-1 text-white/70">{alignment}</span>
                        )}
                    </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <div className="rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-right text-xs text-white/70">
                        <p className="font-semibold text-white">{spellsCount}</p>
                        <p>known spells</p>
                    </div>
                    <form action={deleteCharacter} className="text-right">
                        <input type="hidden" name="characterId" value={id} />
                        <button
                            type="submit"
                            className="rounded-full border border-white/20 px-3 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.3em] text-white/70 transition hover:border-rose-300 hover:text-rose-200"
                        >
                            Delete
                        </button>
                    </form>
                </div>
            </div>

            <dl className="grid grid-cols-3 gap-2 text-center text-xs font-semibold uppercase tracking-wide text-white/70">
                {["str", "dex", "con", "int", "wis", "cha"].map((ability) => {
                    const score = abilityScores[ability] ?? 0;
                    return (
                        <div key={ability} className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2">
                            <dt className="text-[0.6rem] text-white/50">{ability}</dt>
                            <dd className="text-lg text-white">{score}</dd>
                        </div>
                    );
                })}
            </dl>

            <div className="flex items-center justify-between text-xs text-white/60">
                <span>Updated {updatedAt.toLocaleDateString()}</span>
                <Link
                    href={`/characters/${id}`}
                    className="text-rose-200 underline-offset-4 transition hover:text-rose-100 hover:underline"
                >
                    Open sheet
                </Link>
            </div>
        </article>
    );
}
