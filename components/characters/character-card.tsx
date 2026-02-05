import Link from "next/link";

import { deleteCharacter } from "@/app/characters/actions";
import { Card } from "@/components/ui/card";
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
        updatedAt: Date | string;
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
    const updatedAtValue = updatedAt instanceof Date ? updatedAt : new Date(updatedAt);
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
    const summary = (
        <div className="flex items-center justify-between gap-4">
            <h3 className="text-lg font-bold text-white truncate">{name}</h3>
            <span className="rounded-full border border-white/20 px-3 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-white/70 transition hover:border-rose-200 hover:text-white">
                <span className="group-open:hidden">Minimize</span>
                <span className="hidden group-open:inline">Expand</span>
            </span>
        </div>
    );

    return (
        <Card
            collapsible
            summary={summary}
            headerClassName="relative z-20 flex items-center justify-between gap-4"
            bodyClassName="mt-5"
            className="group relative rounded-2xl border border-white/15 bg-gradient-to-br from-white/10 to-white/5 p-6 text-white transition-all duration-300 hover:-translate-y-2 hover:border-rose-300/80 hover:shadow-2xl hover:shadow-rose-500/20"
        >
            <Link
                href={`/characters/${id}`}
                className="absolute inset-0 rounded-2xl z-10 pointer-events-none focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 group-open:pointer-events-auto"
                aria-label={`Open sheet for ${name}`}
            >
                <span className="sr-only">Open sheet</span>
            </Link>
            <div className="relative z-20 flex flex-col gap-5 pointer-events-none">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-xl font-bold text-white truncate">{name}</h3>
                            <span className="flex-shrink-0 rounded-full bg-rose-400/20 px-2 py-0.5 text-[0.65rem] font-bold text-rose-300">
                                Lvl {level}
                            </span>
                        </div>
                        <p className="text-sm text-white/80 mb-1">{subtitle || "Awaiting class + ancestry"}</p>
                        <p className="text-xs text-white/50">{generationMethodCopy[generationMethod]}</p>
                        <div className="mt-3 flex flex-wrap gap-2 text-[0.65rem]">
                            {background && (
                                <span className="rounded-lg border border-white/20 bg-white/5 px-2.5 py-1 text-white/80">{background}</span>
                            )}
                            {alignment && (
                                <span className="rounded-lg border border-white/20 bg-white/5 px-2.5 py-1 text-white/80">{alignment}</span>
                            )}
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-2.5 pointer-events-auto flex-shrink-0">
                        <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-2.5 text-right backdrop-blur-sm">
                            <p className="text-xl font-bold text-emerald-300">{spellsCount}</p>
                            <p className="text-[0.65rem] text-emerald-200/80">Spells</p>
                        </div>
                        {disableLevelUp || !canLevelUp ? (
                            <button
                                type="button"
                                disabled
                                aria-disabled="true"
                                title={disableLevelUp ? "Guest access cannot level up" : "Maximum level reached"}
                                className="rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-[0.65rem] font-semibold text-white/40 cursor-not-allowed"
                            >
                                Level Up
                            </button>
                        ) : (
                            <Link
                                href={`/characters/${id}/level-up`}
                                className="rounded-lg border border-emerald-400/40 bg-emerald-400/10 px-3 py-1.5 text-[0.65rem] font-bold text-emerald-300 transition hover:bg-emerald-400/20 hover:border-emerald-400/60"
                            >
                                Level Up
                            </Link>
                        )}
                        <form action={deleteCharacter} className="text-right">
                            <input type="hidden" name="characterId" value={id} />
                            <button
                                type="submit"
                                className="rounded-lg border border-rose-400/40 bg-rose-400/10 px-3 py-1.5 text-[0.65rem] font-semibold text-rose-300 transition hover:bg-rose-400/20 hover:border-rose-400/60"
                            >
                                Delete
                            </button>
                        </form>
                    </div>
                </div>

                <div className="border-t border-white/10 pt-4">
                    <dl className="grid grid-cols-6 gap-2.5">
                        {["str", "dex", "con", "int", "wis", "cha"].map((ability) => {
                            const score = abilityScores[ability] ?? 0;
                            return (
                                <div key={ability} className="rounded-xl border border-white/15 bg-black/30 px-2 py-2.5 text-center">
                                    <dt className="text-[0.6rem] font-bold uppercase text-white/60">{ability}</dt>
                                    <dd className="mt-1 text-xl font-bold text-white">{score}</dd>
                                </div>
                            );
                        })}
                    </dl>
                </div>

                {(topSkills.length > 0 || topWeapons.length > 0 || topArmor.length > 0) && (
                    <div className="space-y-2.5 text-[0.65rem]">
                        {topSkills.length > 0 && (
                            <div>
                                <p className="mb-1.5 text-[0.6rem] font-bold uppercase tracking-wider text-white/50">Top Skills</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {topSkills.map((skill) => (
                                        <span key={skill} className="rounded-lg border border-blue-400/30 bg-blue-400/10 px-2 py-1 text-blue-300">
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                        {topWeapons.length > 0 && (
                            <div>
                                <p className="mb-1.5 text-[0.6rem] font-bold uppercase tracking-wider text-white/50">Weapons</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {topWeapons.map((weapon) => (
                                        <span key={weapon} className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-2 py-1 text-amber-300">
                                            {weapon}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                        {topArmor.length > 0 && (
                            <div>
                                <p className="mb-1.5 text-[0.6rem] font-bold uppercase tracking-wider text-white/50">Armor</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {topArmor.map((armor) => (
                                        <span key={armor} className="rounded-lg border border-amber-300/30 bg-amber-300/10 px-2 py-1 text-amber-200">
                                            {armor}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <div className="flex items-center justify-between border-t border-white/10 pt-4 text-xs">
                    <span className="text-white/50">Updated {updatedAtValue.toLocaleDateString()}</span>
                    <div className="flex items-center gap-3 pointer-events-auto">
                        <Link
                            href={`/api/characters/${id}/sheet`}
                            prefetch={false}
                            className="font-semibold text-white/70 transition hover:text-white"
                        >
                            Export PDF
                        </Link>
                        <Link
                            href={`/characters/${id}`}
                            className="font-semibold text-rose-300 transition hover:text-rose-200"
                        >
                            View sheet
                        </Link>
                    </div>
                </div>
            </div>
        </Card>
    );
}
