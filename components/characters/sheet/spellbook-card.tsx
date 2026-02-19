import Link from "next/link";
import { Card } from "@/components/ui/card";
import { SPELL_AFFINITY_LABELS } from "@/lib/spells/labels";
import type { SpellTargetAffinity } from "@prisma/client";

type Spell = {
    id: string;
    name: string;
    level: number;
    school: string | null;
    affinity: string;
    range: string | null;
    damage: string | null;
    description: string | null;
};

type Props = {
    characterId: string;
    spells: Spell[];
};

export function SpellbookCard({ characterId, spells }: Props) {
    return (
        <Card
            as="section"
            collapsible
            title="Spellbook"
            titleAs="h2"
            titleClassName="text-xl font-bold text-white"
            headerClassName="flex items-start justify-between gap-3 p-6"
            bodyClassName="px-6 pb-6"
            className="rounded-2xl border border-white/15 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm"
        >
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <p className="text-sm text-white/70">Known spells and abilities</p>
                <div className="flex items-center gap-4">
                    <span className="rounded-xl border border-blue-400/40 bg-blue-400/10 px-4 py-2 text-sm font-bold text-blue-300">
                        {spells.length} Spells
                    </span>
                    <Link href={`/characters/${characterId}/spells`} className="text-sm font-semibold text-rose-300 hover:text-rose-200 transition">
                        Manage spells
                    </Link>
                </div>
            </div>
            {spells.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/20 bg-black/20 p-8 text-center">
                    <p className="text-white/60">No spells learned yet.</p>
                    <Link href={`/characters/${characterId}/spells`} className="mt-3 inline-block text-sm font-semibold text-rose-300 hover:text-rose-200 transition">
                        Add your first spell
                    </Link>
                </div>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                    {spells.map((spell) => (
                        <article key={spell.id} className="rounded-xl border border-white/15 bg-gradient-to-br from-black/40 to-black/20 p-4">
                            <div className="flex items-start justify-between gap-3 mb-3">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="rounded-lg bg-blue-400/20 px-2 py-0.5 text-xs font-bold text-blue-300">Lvl {spell.level}</span>
                                        {spell.school && <span className="text-xs text-white/50">{spell.school}</span>}
                                    </div>
                                    <h3 className="text-lg font-bold text-white">{spell.name}</h3>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2 text-xs mb-3">
                                <span className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-white/70">
                                    {SPELL_AFFINITY_LABELS[spell.affinity as SpellTargetAffinity]}
                                </span>
                                <span className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-white/70">{spell.range ?? "Self"}</span>
                                {spell.damage && (
                                    <span className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-2.5 py-1 text-rose-300">{spell.damage}</span>
                                )}
                            </div>
                            {spell.description && <p className="text-sm text-white/70 line-clamp-2">{spell.description}</p>}
                        </article>
                    ))}
                </div>
            )}
        </Card>
    );
}
