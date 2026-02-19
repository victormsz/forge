import Link from "next/link";
import { Card } from "@/components/ui/card";

type InventoryItem = {
    id: string;
    name: string;
    category: string | null;
    quantity: number;
    cost: string | null;
    weight: number | null;
    notes: string | null;
    description: string | null;
    damageLabel: string | null;
    rangeLabel: string | null;
    masteryTag: string | null;
    weaponProperties: string[];
    isCustom: boolean;
    updatedAt: Date;
};

type Props = {
    characterId: string;
    items: InventoryItem[];
    totalCount: number;
    totalWeight: number;
    totalQuantity: number;
};

export function InventoryPreviewCard({ characterId, items, totalCount, totalWeight, totalQuantity }: Props) {
    return (
        <Card
            as="section"
            collapsible
            title="Inventory Preview"
            titleAs="h2"
            titleClassName="text-xl font-bold text-white"
            headerClassName="flex items-start justify-between gap-3 p-6"
            bodyClassName="px-6 pb-6"
            className="rounded-2xl border border-white/15 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm"
        >
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <p className="text-sm text-white/70">Recent kit additions and carried weight.</p>
                <div className="flex items-center gap-4">
                    <span className="rounded-xl border border-sky-400/40 bg-sky-400/10 px-4 py-2 text-sm font-bold text-sky-200">
                        {totalCount} Items
                    </span>
                    <Link href={`/characters/${characterId}/items`} className="text-sm font-semibold text-sky-300 hover:text-sky-100 transition">
                        Open inventory
                    </Link>
                </div>
            </div>
            <div className="flex flex-wrap gap-3 text-xs uppercase tracking-[0.3em] text-white/60">
                <span className="rounded-full border border-white/20 px-4 py-1.5 text-white/80">{totalWeight.toFixed(1)} lb carried</span>
                <span className="rounded-full border border-white/20 px-4 py-1.5 text-white/80">{totalQuantity} pieces tracked</span>
            </div>
            {items.length === 0 ? (
                <div className="mt-6 rounded-xl border border-dashed border-white/20 bg-black/20 p-6 text-center">
                    <p className="text-white/60">No inventory entries yet.</p>
                    <Link href={`/characters/${characterId}/items`} className="mt-3 inline-block text-sm font-semibold text-sky-300 hover:text-sky-100 transition">
                        Start packing
                    </Link>
                </div>
            ) : (
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    {items.map((item) => (
                        <article key={item.id} className="group relative rounded-xl border border-white/15 bg-gradient-to-br from-black/40 to-black/20 p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-xs uppercase tracking-[0.35em] text-white/50">{item.category ?? "Misc gear"}</p>
                                    <h3 className="text-lg font-bold text-white">{item.name}</h3>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-bold text-white">{item.quantity}</p>
                                    <p className="text-[0.65rem] uppercase tracking-[0.3em] text-white/50">Qty</p>
                                </div>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/70">
                                {item.cost && <span className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1">{item.cost}</span>}
                                {typeof item.weight === "number" && (
                                    <span className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1">{(item.weight * item.quantity).toFixed(1)} lb</span>
                                )}
                                {item.damageLabel && (
                                    <span className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-2.5 py-1 text-rose-200">{item.damageLabel}</span>
                                )}
                                {item.rangeLabel && (
                                    <span className="rounded-lg border border-blue-400/30 bg-blue-400/10 px-2.5 py-1 text-blue-200">{item.rangeLabel}</span>
                                )}
                                {item.masteryTag && (
                                    <span className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-amber-200">{item.masteryTag}</span>
                                )}
                                {item.weaponProperties.slice(0, 3).map((prop) => (
                                    <span key={`${item.id}-${prop}`} className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-emerald-200">
                                        {prop}
                                    </span>
                                ))}
                                <span className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1">{item.isCustom ? "Custom" : "SRD"}</span>
                            </div>
                            {(item.notes || item.description) && (
                                <div className="pointer-events-none absolute left-4 right-4 top-16 z-10 translate-y-2 rounded-xl border border-white/20 bg-black/80 p-3 text-xs text-white/90 opacity-0 shadow-2xl shadow-black/60 backdrop-blur-sm transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100">
                                    {item.description && <p className="leading-relaxed text-white/90 line-clamp-4">{item.description}</p>}
                                    {item.notes && <p className={`leading-relaxed text-sky-200 ${item.description ? "mt-2" : ""}`}>{item.notes}</p>}
                                </div>
                            )}
                            <p className="mt-3 text-[0.65rem] uppercase tracking-[0.3em] text-white/50">Updated {item.updatedAt.toLocaleDateString()}</p>
                        </article>
                    ))}
                </div>
            )}
        </Card>
    );
}
