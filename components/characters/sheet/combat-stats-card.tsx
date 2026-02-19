import { Card } from "@/components/ui/card";
import { formatModifier } from "@/lib/characters/statistics";
import type { AbilityKey } from "@/lib/point-buy";

type Props = {
    armorClass: number;
    armorSegments: string | number;
    abilityModifiers: Record<AbilityKey, number>;
    proficiencyBonus: number;
    hitDiceDisplay: string;
    maxHpEstimate: number;
    level: number;
    charClass: string | null;
};

export function CombatStatsCard({
    armorClass,
    armorSegments,
    abilityModifiers,
    proficiencyBonus,
    hitDiceDisplay,
    maxHpEstimate,
    level,
    charClass,
}: Props) {
    const stats = [
        { label: "Armor Class", value: armorClass, detail: armorSegments },
        { label: "Initiative", value: formatModifier(abilityModifiers.dex), detail: "Dexterity modifier" },
        { label: "Speed", value: "30 ft", detail: "Walking speed" },
        { label: "Proficiency", value: `+${proficiencyBonus}`, detail: `Level ${level}` },
        { label: "Hit Dice", value: hitDiceDisplay, detail: charClass || "Default d8" },
        { label: "Max HP", value: maxHpEstimate, detail: "Full die plus average rolls and CON" },
    ];

    return (
        <Card
            collapsible
            title="Combat Stats"
            titleAs="h2"
            titleClassName="text-sm font-bold uppercase tracking-wider text-white/60"
            headerClassName="flex items-start justify-between gap-3 p-6"
            bodyClassName="px-6 pb-6"
            className="rounded-3xl border border-white/15 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm"
        >
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {stats.map((stat) => (
                    <div key={stat.label} className="rounded-2xl border border-white/15 bg-gradient-to-br from-black/40 to-black/20 p-4">
                        <div className="mb-2 text-xs uppercase tracking-wider text-white/60">{stat.label}</div>
                        <div className="text-3xl font-bold text-white">{stat.value}</div>
                        <p className="mt-2 text-xs text-white/50">{stat.detail}</p>
                    </div>
                ))}
            </div>
        </Card>
    );
}
