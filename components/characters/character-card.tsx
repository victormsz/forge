import Link from "next/link";

import { deleteCharacter } from "@/app/characters/actions";
import { MAX_CHARACTER_LEVEL } from "@/lib/characters/constants";

type AbilityScores = Record<string, number>;

type AbilityGenerationMethod = "POINT_BUY" | "RANDOM";

const EMPTY_PROFICIENCIES = {
    armor: [] as string[],
    weapons: [] as string[],
    tools: [] as string[],
    skills: [] as string[],
    languages: [] as string[],
};

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
        proficiencies: {
            armor: string[];
            weapons: string[];
            tools: string[];
            skills: string[];
            languages: string[];
        };
        spellsCount: number;
        updatedAt: Date;
    };
    disableLevelUp?: boolean;
}

const generationMethodCopy: Record<AbilityGenerationMethod, string> = {
    POINT_BUY: "Point Buy",
    RANDOM: "Random Rolls",
};

export function CharacterCard({ character, disableLevelUp = false }: CharacterCardProps) {
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
        proficiencies: rawProficiencies,
        spellsCount,
        updatedAt,
    } = character;
    const subtitle = [
        charClass ? `Lvl ${level} ${charClass}` : `Level ${level}`,
        ancestry,
    ]
        .filter(Boolean)
        .join(" · ");

    const canLevelUp = level < MAX_CHARACTER_LEVEL;
    const proficiencies = rawProficiencies
        ? {
            armor: rawProficiencies.armor ?? EMPTY_PROFICIENCIES.armor,
            weapons: rawProficiencies.weapons ?? EMPTY_PROFICIENCIES.weapons,
            tools: rawProficiencies.tools ?? EMPTY_PROFICIENCIES.tools,
            skills: rawProficiencies.skills ?? EMPTY_PROFICIENCIES.skills,
            languages: rawProficiencies.languages ?? EMPTY_PROFICIENCIES.languages,
        }
        : EMPTY_PROFICIENCIES;
    const topSkills = proficiencies.skills.slice(0, 4);
    const topWeapons = proficiencies.weapons.slice(0, 3);
    const topArmor = proficiencies.armor.slice(0, 2);

    return (
        <article className="group relative rounded-3xl border border-white/10 bg-white/5 p-4 text-white transition hover:-translate-y-1 hover:border-rose-300/60 hover:bg-white/10">
            <Link
                href={`/characters/${id}`}
                className="absolute inset-0 rounded-3xl z-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                aria-label={`Open sheet for ${name}`}
            >
                <span className="sr-only">Open sheet</span>
            </Link>
            <div className="relative z-20 flex flex-col gap-4 pointer-events-none">
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
                        {(topSkills.length > 0 || topWeapons.length > 0 || topArmor.length > 0) && (
                            <div className="mt-4 space-y-2 text-[0.65rem] text-white/70">
                                {topSkills.length > 0 && (
                                    <div>
                                        <p className="uppercase tracking-[0.3em] text-white/50">Skills</p>
                                        <div className="mt-1 flex flex-wrap gap-1">
                                            {topSkills.map((skill) => (
                                                <span key={skill} className="rounded-full border border-white/15 px-2 py-0.5 text-white/80">
                                                    {skill}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {topWeapons.length > 0 && (
                                    <div>
                                        <p className="uppercase tracking-[0.3em] text-white/50">Weapons</p>
                                        <div className="mt-1 flex flex-wrap gap-1">
                                            {topWeapons.map((weapon) => (
                                                <span key={weapon} className="rounded-full border border-white/15 px-2 py-0.5 text-white/80">
                                                    {weapon}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {topArmor.length > 0 && (
                                    <div>
                                        <p className="uppercase tracking-[0.3em] text-white/50">Armor</p>
                                        <div className="mt-1 flex flex-wrap gap-1">
                                            {topArmor.map((armor) => (
                                                <span key={armor} className="rounded-full border border-white/15 px-2 py-0.5 text-white/80">
                                                    {armor}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="flex flex-col items-end gap-2 pointer-events-auto">
                        <div className="rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-right text-xs text-white/70">
                            <p className="font-semibold text-white">{spellsCount}</p>
                            <p>known spells</p>
                        </div>
                        {disableLevelUp || !canLevelUp ? (
                            <button
                                type="button"
                                disabled
                                aria-disabled="true"
                                title={disableLevelUp ? "Guest access cannot level up" : "Maximum level reached"}
                                className="rounded-full border border-white/20 px-3 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.3em] text-white/30"
                            >
                                Level up
                            </button>
                        ) : (
                            <Link
                                href={`/characters/${id}/level-up`}
                                className="rounded-full border border-white/20 px-3 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.3em] text-white/90 transition hover:border-emerald-300 hover:text-emerald-200"
                            >
                                Level up
                            </Link>
                        )}
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
                    <div className="flex items-center gap-3 pointer-events-auto">
                        <Link
                            href={`/api/characters/${id}/sheet`}
                            prefetch={false}
                            className="text-white/70 underline-offset-4 transition hover:text-white hover:underline"
                        >
                            Export PDF
                        </Link>
                        <Link
                            href={`/characters/${id}`}
                            className="text-rose-200 underline-offset-4 transition hover:text-rose-100 hover:underline"
                        >
                            Open sheet
                        </Link>
                    </div>
                </div>
            </div>
        </article>
    );
}
