import { Card } from "@/components/ui/card";

type Props = {
    feats: string[];
    acquiredLevel?: number;
    acquiredAt?: string | null;
};

export function FeatsCard({ feats, acquiredLevel, acquiredAt }: Props) {
    return (
        <Card
            as="section"
            collapsible
            title="Feats"
            titleAs="h2"
            titleClassName="text-xl font-bold text-white"
            headerClassName="flex items-start justify-between gap-3 p-6"
            bodyClassName="px-6 pb-6"
            className="rounded-2xl border border-white/15 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm"
        >
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <p className="text-sm text-white/70">Special abilities and character features</p>
                <span className="rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-2 text-sm font-bold text-amber-300">
                    {feats.length} {feats.length === 1 ? "Feat" : "Feats"}
                </span>
            </div>
            {feats.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/20 bg-black/20 p-8 text-center">
                    <p className="text-white/60">No feats acquired yet.</p>
                    <p className="mt-2 text-sm text-white/50">Feats are typically gained at levels 4, 8, 12, 16, and 19.</p>
                </div>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                    {feats.map((feat, i) => (
                        <article key={`${feat}-${i}`} className="rounded-xl border border-amber-400/30 bg-gradient-to-br from-amber-400/10 to-amber-400/5 p-5">
                            <h3 className="text-lg font-bold text-white">{feat}</h3>
                            <div className="mt-3 flex items-center gap-2 text-xs">
                                {acquiredLevel != null && (
                                    <span className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-amber-300 font-semibold">
                                        Level {acquiredLevel}
                                    </span>
                                )}
                                {acquiredAt && <span className="text-white/50">Acquired {new Date(acquiredAt).toLocaleDateString()}</span>}
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </Card>
    );
}
