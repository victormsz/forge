import { Card } from "@/components/ui/card";
import { formatModifier } from "@/lib/characters/statistics";
import type { SkillSummary } from "@/lib/characters/statistics";

type Props = {
    skillSummaries: SkillSummary[];
    proficiencyBonus: number;
};

export function SkillsCard({ skillSummaries, proficiencyBonus }: Props) {
    return (
        <Card
            collapsible
            title="Skills"
            titleAs="h2"
            titleClassName="text-sm font-bold uppercase tracking-wider text-white/60"
            headerClassName="flex items-start justify-between gap-3 p-6"
            bodyClassName="px-6 pb-6"
            className="rounded-3xl border border-white/15 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm"
        >
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {skillSummaries.map((skill) => (
                    <div
                        key={skill.label}
                        className={`rounded-2xl border p-4 ${skill.proficient
                                ? "border-rose-400/40 bg-rose-400/10"
                                : "border-white/15 bg-gradient-to-br from-black/40 to-black/20"
                            }`}
                    >
                        <div className="mb-2 flex items-center justify-between text-[0.65rem] font-bold uppercase tracking-wider">
                            <span className={skill.proficient ? "text-rose-300" : "text-white/60"}>{skill.label}</span>
                            <span className="text-white/50">{skill.ability.toUpperCase()}</span>
                        </div>
                        <div className="flex items-baseline justify-between gap-3">
                            <span className="text-2xl font-bold text-white">{formatModifier(skill.total)}</span>
                            <span className="text-xs text-white/70">
                                {skill.proficient ? `+${proficiencyBonus} prof` : `${formatModifier(skill.base)} base`}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    );
}
