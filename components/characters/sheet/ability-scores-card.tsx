import { Card } from "@/components/ui/card";
import { ABILITY_KEYS, type AbilityKey } from "@/lib/point-buy";
import { formatModifier } from "@/lib/characters/statistics";

const abilityDetails: Record<AbilityKey, { label: string; blurb: string }> = {
    str: { label: "Strength", blurb: "Force · Athletics" },
    dex: { label: "Dexterity", blurb: "Agility · Reflex" },
    con: { label: "Constitution", blurb: "Endurance" },
    int: { label: "Intelligence", blurb: "Logic" },
    wis: { label: "Wisdom", blurb: "Insight" },
    cha: { label: "Charisma", blurb: "Presence" },
};

type Props = {
    abilityScores: Record<AbilityKey, number>;
    abilityModifiers: Record<AbilityKey, number>;
};

export function AbilityScoresCard({ abilityScores, abilityModifiers }: Props) {
    return (
        <Card
            collapsible
            title="Ability Scores"
            titleAs="h2"
            titleClassName="text-sm font-bold uppercase tracking-wider text-white/60"
            headerClassName="flex items-start justify-between gap-3 p-6"
            bodyClassName="px-6 pb-6"
            className="rounded-3xl border border-white/15 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm"
        >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                {ABILITY_KEYS.map((key) => (
                    <div key={key} className="rounded-2xl border border-white/15 bg-gradient-to-br from-black/40 to-black/20 p-4">
                        <p className="text-[0.6rem] font-bold uppercase tracking-wider text-white/60 mb-3">
                            {abilityDetails[key].label}
                        </p>
                        <div className="flex items-end justify-between gap-2">
                            <span className="text-4xl font-bold text-white">{abilityScores[key]}</span>
                            <span className="rounded-xl border border-white/30 bg-white/10 px-3 py-1.5 text-sm font-bold text-white">
                                {formatModifier(abilityModifiers[key])}
                            </span>
                        </div>
                        <p className="mt-2 text-[0.6rem] text-white/50">{abilityDetails[key].blurb}</p>
                    </div>
                ))}
            </div>
        </Card>
    );
}
