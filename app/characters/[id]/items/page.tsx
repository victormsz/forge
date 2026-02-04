import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";

import { addItem, deleteItem } from "@/app/characters/actions";
import { ItemLibraryForm } from "@/components/items/item-library-form";
import { getCurrentActor } from "@/lib/current-actor";
import { prisma } from "@/lib/prisma";
import { getItemCategoryOptions, getReferenceItems } from "@/lib/items/reference";

export const metadata: Metadata = {
    title: "ForgeSheet | Inventory Forge",
    description: "Attach SRD items or custom kit notes to your character sheet.",
};

const referenceItems = getReferenceItems();
const categoryOptions = getItemCategoryOptions();

interface CharacterItemsPageProps {
    params: Promise<{ id: string }>;
}

export default async function CharacterItemsPage({ params }: CharacterItemsPageProps) {
    const { id } = await params;
    const actor = await getCurrentActor();

    if (!actor) {
        redirect("/");
    }

    const character = await prisma.character.findFirst({
        where: { id, userId: actor.userId },
        select: {
            id: true,
            name: true,
            level: true,
            charClass: true,
            items: {
                orderBy: [
                    { category: "asc" },
                    { name: "asc" },
                ],
                select: {
                    id: true,
                    name: true,
                    category: true,
                    cost: true,
                    weight: true,
                    quantity: true,
                    description: true,
                    notes: true,
                    isCustom: true,
                    updatedAt: true,
                },
            },
        },
    });

    if (!character) {
        notFound();
    }

    const totalWeight = character.items.reduce((sum, item) => {
        const weight = typeof item.weight === "number" ? item.weight : 0;
        return sum + weight * item.quantity;
    }, 0);
    const formattedWeight = `${totalWeight.toFixed(1)} lb`;

    const categoryTally = character.items.reduce<Map<string, number>>((map, item) => {
        const key = item.category ?? "Misc";
        map.set(key, (map.get(key) ?? 0) + 1);
        return map;
    }, new Map());
    const dominantCategories = Array.from(categoryTally.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(134,200,255,0.12),_transparent_55%),_#02050b] text-white">
            <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-16 sm:px-6 lg:px-8">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-sky-200">Inventory forge</p>
                        <h1 className="text-3xl font-semibold text-white sm:text-4xl">{character.name}</h1>
                        <p className="text-sm text-white/70">
                            {character.charClass ? `Level ${character.level} ${character.charClass}` : `Level ${character.level}`}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <Link
                            href={`/characters/${character.id}`}
                            className="rounded-full border border-white/20 px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:border-sky-200"
                        >
                            Back to sheet
                        </Link>
                        <Link
                            href="/characters"
                            className="rounded-full border border-white/20 px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:border-sky-200"
                        >
                            Back to roster
                        </Link>
                    </div>
                </div>

                <section className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                    <div className="space-y-8">
                        <article className="rounded-3xl border border-white/10 bg-white/5 p-6">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <h2 className="text-lg font-semibold text-white">Pack overview</h2>
                                    <p className="text-sm text-white/70">Quick look at mass, categories, and kit size.</p>
                                </div>
                                <span className="text-xs uppercase tracking-[0.3em] text-white/60">{character.items.length} entries</span>
                            </div>
                            <div className="mt-6 grid gap-4 sm:grid-cols-2">
                                <div className="rounded-2xl border border-sky-400/40 bg-sky-400/10 p-4">
                                    <p className="text-xs uppercase tracking-[0.3em] text-sky-200">Total weight</p>
                                    <p className="mt-2 text-3xl font-semibold text-white">{formattedWeight}</p>
                                    <p className="text-xs text-white/70">Auto-calculated from entries (quantity × weight).</p>
                                </div>
                                <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                                    <p className="text-xs uppercase tracking-[0.3em] text-white/60">Top categories</p>
                                    {dominantCategories.length === 0 ? (
                                        <p className="mt-2 text-sm text-white/60">Add items to populate category stats.</p>
                                    ) : (
                                        <div className="mt-3 space-y-2 text-sm text-white/80">
                                            {dominantCategories.map(([label, count]) => (
                                                <div key={label} className="flex items-center justify-between">
                                                    <span>{label}</span>
                                                    <span className="text-white/60">{count}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </article>

                        <article className="rounded-3xl border border-white/10 bg-white/5 p-6">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <h2 className="text-lg font-semibold text-white">Inventory</h2>
                                    <p className="text-sm text-white/70">Everything packed, stowed, or attuned.</p>
                                </div>
                                <span className="text-xs uppercase tracking-[0.3em] text-white/60">{character.items.length} cataloged</span>
                            </div>

                            {character.items.length === 0 ? (
                                <p className="mt-6 rounded-2xl border border-dashed border-white/12 bg-black/30 p-6 text-sm text-white/60">
                                    No items yet. Use the library on the right to add SRD gear or custom loot.
                                </p>
                            ) : (
                                <div className="mt-6 space-y-4">
                                    {character.items.map((item) => (
                                        <article key={item.id} className="rounded-2xl border border-white/10 bg-black/30 p-4">
                                            <div className="flex flex-wrap items-center justify-between gap-3">
                                                <div>
                                                    <p className="text-xs uppercase tracking-[0.35em] text-white/50">{item.category ?? "Misc gear"}</p>
                                                    <h3 className="text-xl font-semibold text-white">{item.name}</h3>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-2 text-xs text-white/70">
                                                    <span className="rounded-full border border-white/15 px-3 py-1">Qty {item.quantity}</span>
                                                    {typeof item.weight === "number" && (
                                                        <span className="rounded-full border border-white/15 px-3 py-1">{(item.weight * item.quantity).toFixed(1)} lb</span>
                                                    )}
                                                    {item.cost && (
                                                        <span className="rounded-full border border-white/15 px-3 py-1">{item.cost}</span>
                                                    )}
                                                    <span className="rounded-full border border-white/15 px-3 py-1">
                                                        {item.isCustom ? "Custom" : "SRD"}
                                                    </span>
                                                </div>
                                            </div>
                                            {item.description && (
                                                <p className="mt-3 text-sm text-white/70">{item.description}</p>
                                            )}
                                            {item.notes && (
                                                <p className="mt-3 text-sm text-sky-200">{item.notes}</p>
                                            )}
                                            <p className="mt-3 text-xs uppercase tracking-[0.3em] text-white/50">Updated {item.updatedAt.toLocaleDateString()}</p>
                                            <form action={deleteItem} className="mt-4 flex items-center justify-end gap-3">
                                                <input type="hidden" name="itemId" value={item.id} />
                                                <input type="hidden" name="characterId" value={character.id} />
                                                <button
                                                    type="submit"
                                                    className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-white/80 transition hover:border-rose-300 hover:text-white"
                                                >
                                                    Delete
                                                </button>
                                            </form>
                                        </article>
                                    ))}
                                </div>
                            )}
                        </article>
                    </div>

                    <ItemLibraryForm
                        characterId={character.id}
                        references={referenceItems}
                        categoryOptions={categoryOptions}
                        action={addItem}
                    />
                </section>
            </main>
        </div>
    );
}
