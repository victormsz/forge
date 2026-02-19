import { Card } from "@/components/ui/card";
import type { LevelUpChoicesMeta } from "@/lib/characters/types";

type Props = {
    ownerLabel: string;
    generationLabel: string;
    createdAt: Date;
    updatedAt: Date;
    levelSummary: string;
    levelDetail: string;
};

export function CharacterInfoCard({
    ownerLabel,
    generationLabel,
    createdAt,
    updatedAt,
    levelSummary,
    levelDetail,
}: Props) {
    return (
        <Card
            collapsible
            title="Character Info"
            titleAs="h2"
            titleClassName="text-sm font-bold uppercase tracking-wider text-white/70"
            headerClassName="flex items-start justify-between gap-3 p-6"
            bodyClassName="px-6 pb-6"
            className="rounded-2xl border border-white/15 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm"
        >
            <dl className="mt-4 space-y-3.5 text-sm">
                {[
                    { label: "Owner", value: ownerLabel },
                    { label: "Generation", value: generationLabel },
                    { label: "Created", value: createdAt.toLocaleDateString() },
                    { label: "Last Updated", value: updatedAt.toLocaleDateString() },
                ].map(({ label, value }) => (
                    <div key={label}>
                        <dt className="text-xs font-bold uppercase tracking-wider text-white/50 mb-1">{label}</dt>
                        <dd className="text-white">{value}</dd>
                    </div>
                ))}
                <div className="pt-2 border-t border-white/10">
                    <dt className="text-xs font-bold uppercase tracking-wider text-white/50 mb-1">Level Progress</dt>
                    <dd className="text-white font-semibold">{levelSummary}</dd>
                    <dd className="mt-1 text-xs text-white/60">{levelDetail}</dd>
                </div>
            </dl>
        </Card>
    );
}
