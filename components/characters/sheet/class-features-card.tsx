import { Card } from "@/components/ui/card";

type Feature = {
    index: string;
    name: string;
    desc: string[];
};

type Props = {
    features: Feature[];
};

export function ClassFeaturesCard({ features }: Props) {
    return (
        <Card
            as="section"
            collapsible
            title="Class Features"
            titleAs="h2"
            titleClassName="text-xl font-bold text-white"
            headerClassName="flex items-start justify-between gap-3 p-6"
            bodyClassName="px-6 pb-6"
            className="rounded-2xl border border-white/15 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm"
        >
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <p className="text-sm text-white/70">Abilities gained from your class and subclass</p>
                <span className="rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-4 py-2 text-sm font-bold text-emerald-300">
                    {features.length} {features.length === 1 ? "Feature" : "Features"}
                </span>
            </div>
            {features.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/20 bg-black/20 p-8 text-center">
                    <p className="text-white/60">No class features tracked yet.</p>
                    <p className="mt-2 text-sm text-white/50">Choose a class to unlock your feature list.</p>
                </div>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                    {features.map((feature) => (
                        <article key={feature.index} className="rounded-xl border border-emerald-400/20 bg-gradient-to-br from-emerald-400/10 to-emerald-400/5 p-5">
                            <h3 className="text-lg font-bold text-white">{feature.name}</h3>
                            {feature.desc.length > 0 ? (
                                <div className="mt-2 space-y-1 text-sm text-white/70">
                                    {feature.desc.map((line, i) => (
                                        <p key={`${feature.index}-${i}`} className="leading-relaxed">{line}</p>
                                    ))}
                                </div>
                            ) : (
                                <p className="mt-2 text-sm text-white/50">Description not available.</p>
                            )}
                        </article>
                    ))}
                </div>
            )}
        </Card>
    );
}
