import { Card } from "@/components/ui/card";
import type { CharacterProficiencies } from "@/lib/characters/types";

type Props = {
    proficiencies: CharacterProficiencies;
};

export function ProficienciesCard({ proficiencies }: Props) {
    const total = Object.values(proficiencies).reduce((sum, list) => sum + list.length, 0);

    return (
        <Card
            as="section"
            collapsible
            title="Proficiencies & Languages"
            titleAs="h2"
            titleClassName="text-xl font-bold text-white"
            headerClassName="flex items-start justify-between gap-3 p-6"
            bodyClassName="px-6 pb-6"
            className="rounded-2xl border border-white/15 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm"
        >
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <p className="text-sm text-white/70">Skills, weapons, armor, and languages</p>
                <span className="rounded-xl border border-purple-400/40 bg-purple-400/10 px-4 py-2 text-sm font-bold text-purple-300">
                    {total} Total
                </span>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
                {(Object.entries(proficiencies) as [keyof CharacterProficiencies, string[]][]).map(([key, list]) => (
                    <article key={key} className="rounded-xl border border-white/15 bg-gradient-to-br from-black/40 to-black/20 p-4">
                        <p className="mb-3 text-sm font-bold uppercase tracking-wider text-white/60">
                            {key.charAt(0).toUpperCase() + key.slice(1)}
                        </p>
                        {list.length ? (
                            <div className="flex flex-wrap gap-2">
                                {list.map((item) => (
                                    <span key={item} className="rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/80">
                                        {item}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-white/40">None</p>
                        )}
                    </article>
                ))}
            </div>
        </Card>
    );
}
